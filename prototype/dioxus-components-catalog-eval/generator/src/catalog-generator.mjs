import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { generateSystemPrompt } from "@openuidev/lang-core";

const manifestUrl = new URL("../../catalog/manifest.json", import.meta.url);

export async function loadManifest(url = manifestUrl) {
  return JSON.parse(await readFile(fileURLToPath(url), "utf8"));
}

function typeName(schema) {
  if (schema.format === "component-ref") return "Component";
  if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  if (schema.type === "array") return `${typeName(schema.items)}[]`;
  if (schema.type === "object") return "object";
  return schema.type;
}

function signature(component) {
  const props = component.prop_order.map((name) => {
    const schema = component.props[name];
    const optional = schema.required ? "" : "?";
    return `${name}${optional}: ${typeName(schema)}`;
  });
  return `${component.name}(${props.join(", ")})`;
}

function jsonSchemaForProp(prop) {
  const schema = { type: prop.type };
  if (prop.enum) schema.enum = [...prop.enum];
  if (prop.items) schema.items = jsonSchemaForProp(prop.items);
  if (prop.format) schema.format = prop.format;
  if (prop.type === "object") {
    schema.additionalProperties = prop.additionalProperties ?? false;
    schema.required = [...(prop.required ?? [])];
    schema.properties = Object.fromEntries(
      Object.entries(prop.properties ?? {}).map(([name, child]) => [
        name,
        jsonSchemaForProp(child),
      ]),
    );
  }
  return schema;
}

function componentSchema(component) {
  const properties = { kind: { const: component.name } };
  for (const name of component.prop_order) {
    properties[name] = jsonSchemaForProp(component.props[name]);
  }
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      ...component.prop_order.filter((name) => component.props[name].required),
    ],
    properties,
  };
}

function openUiComponentSchema(component, componentNames) {
  const properties = {};
  for (const name of component.prop_order) {
    properties[name] = openUiSchemaForProp(component.props[name], componentNames);
  }
  return {
    type: "object",
    additionalProperties: false,
    required: component.prop_order.filter((name) => component.props[name].required),
    properties,
    description: component.description,
  };
}

function openUiSchemaForProp(prop, componentNames) {
  if (prop.format === "component-ref") {
    return { oneOf: componentNames.map((name) => ({ $ref: `#/$defs/${name}` })) };
  }
  if (prop.type === "array") {
    return { type: "array", items: openUiSchemaForProp(prop.items, componentNames) };
  }
  if (prop.type === "object") {
    return {
      type: "object",
      additionalProperties: prop.additionalProperties ?? false,
      required: [...(prop.required ?? [])],
      properties: Object.fromEntries(
        Object.entries(prop.properties ?? {}).map(([name, child]) => [
          name,
          openUiSchemaForProp(child, componentNames),
        ]),
      ),
    };
  }
  return jsonSchemaForProp(prop);
}

function typedJsonSchema(manifest) {
  const defs = Object.fromEntries(
    manifest.components.map((component) => [component.name, componentSchema(component)]),
  );
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://openui-dioxus.dev/eval/${manifest.catalog_id}/${manifest.release_version}/surface.schema.json`,
    type: "object",
    additionalProperties: false,
    required: ["root", "nodes", "state"],
    properties: {
      root: { type: "string", minLength: 1 },
      nodes: {
        type: "array",
        minItems: 1,
        maxItems: 64,
        items: {
          oneOf: manifest.components.map((component) => ({
            $ref: `#/$defs/${component.name}`,
          })),
        },
      },
      state: {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries(
          Object.entries(manifest.state_schema).map(([name, type]) => [name, { type }]),
        ),
      },
    },
    $defs: defs,
  };
}

function promptMaterial(manifest, components) {
  const additionalRules = [
    "Arguments are positional and must follow each signature exactly.",
    ...manifest.components.flatMap((component) => [
      ...component.usage_rules,
      ...component.accessibility.map((requirement) => `Accessibility: ${requirement}`),
      ...(component.events.length > 0
        ? [`${component.name} emits only ${component.events.map((event) => event.name).join(", ")}.`]
        : []),
    ]),
    `Allowed state keys: ${manifest.state_keys.join(", ")}.`,
    `Allowed actions: ${manifest.actions.map((action) => action.name).join(", ")}.`,
  ];
  return `${generateSystemPrompt({
    library: {
      id: `${manifest.catalog_id}@${manifest.release_version}`,
      root: manifest.root,
      components,
    },
    promptOptions: {
      preamble: `Generate only an OpenUI Lang program using this closed ${manifest.catalog_id} catalog.`,
      additionalRules,
    },
  }).trim()}\n`;
}

export function deriveArtifacts(manifest) {
  const componentNames = manifest.components.map((component) => component.name);
  const components = Object.fromEntries(
    manifest.components.map((component) => [
      component.name,
      { signature: signature(component), description: component.description },
    ]),
  );
  const schema = typedJsonSchema(manifest);
  return {
    librarySpec: {
      id: `${manifest.catalog_id}@${manifest.release_version}`,
      root: manifest.root,
      components,
      schema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: Object.fromEntries(
          manifest.components.map((component) => [
            component.name,
            { $ref: `#/$defs/${component.name}` },
          ]),
        ),
        $defs: Object.fromEntries(
          manifest.components.map((component) => [
            component.name,
            openUiComponentSchema(component, componentNames),
          ]),
        ),
      },
    },
    typedJsonSchema: schema,
    prompt: promptMaterial(manifest, components),
    registry: manifest.components.map((component) => ({
      name: component.name,
      prop_order: [...component.prop_order],
      events: component.events.map((event) => event.name),
      implementation: component.implementation,
    })),
  };
}

export function flattenOpenUiTree(root, state) {
  const nodes = [];

  function flattenElement(element) {
    if (element?.type !== "element" || typeof element.typeName !== "string") {
      throw new Error("OpenUI value is not a component element");
    }
    const id = element.props?.id;
    if (typeof id !== "string" || id.length === 0) {
      throw new Error(`${element.typeName} has no stable id`);
    }
    const node = { kind: element.typeName };
    nodes.push(node);
    for (const [name, value] of Object.entries(element.props)) {
      node[name] = flattenValue(value);
    }
    return id;
  }

  function flattenValue(value) {
    if (value?.type === "element") return flattenElement(value);
    if (Array.isArray(value)) return value.map(flattenValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, flattenValue(child)]));
    }
    return value;
  }

  const rootId = flattenElement(root);
  return { root: rootId, nodes, state: structuredClone(state) };
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function documentation(manifest) {
  const rows = manifest.components.map((component) =>
    `| ${component.name} | ${component.capability_families.join(", ")} | ${component.implementation.module}::${component.implementation.component} | ${component.events.map((event) => event.name).join(", ") || "none"} |`,
  );
  return `# Frozen ${manifest.catalog_id} evaluation catalog

This catalog exposes exactly 12 reviewed components through the
\`static_rust_v1\` profile. It is an evaluation artifact, not a claim that the
upstream repository or Rust ABI is stable.

- Source: ${manifest.source.repository}
- Commit: \`${manifest.source.commit}\`
- Upstream crate: \`${manifest.source.crate}@${manifest.source.crate_version}\`
- Dioxus: \`${manifest.source.resolved_dioxus_version}\`
- License: \`${manifest.source.license}\`

| Component | Capability families | Upstream binding | Typed events |
| --- | --- | --- | --- |
${rows.join("\n")}

All wire props, state keys, events, accessibility expectations, and platform
adaptations are owned by \`catalog/manifest.json\`. Generated files must not be
edited by hand.
`;
}

function rustString(value) {
  return JSON.stringify(value);
}

function rustRegistry(manifest) {
  const entries = manifest.components.map((component) => `    GeneratedComponentSpec {
        name: ${rustString(component.name)},
        prop_order: &[${component.prop_order.map(rustString).join(", ")}],
        capability_families: &[${component.capability_families.map(rustString).join(", ")}],
        events: &[${component.events.map((event) => rustString(event.name)).join(", ")}],
        source_module: ${rustString(component.implementation.module)},
        source_component: ${rustString(component.implementation.component)},
        source_kind: ${rustString(component.implementation.source_kind)},
    },`);
  return `// @generated by generator/src/catalog-generator.mjs; do not edit.
pub const GENERATED_CATALOG_ID: &str = ${rustString(manifest.catalog_id)};
pub const GENERATED_CATALOG_CONTRACT_VERSION: &str = ${rustString(manifest.catalog_contract_version)};
pub const GENERATED_EXECUTION_PROFILE: &str = ${rustString(manifest.execution_profile)};
pub const GENERATED_SOURCE_COMMIT: &str = ${rustString(manifest.source.commit)};

pub const GENERATED_COMPONENTS: &[GeneratedComponentSpec] = &[
${entries.join("\n")}
];
`;
}

function semanticContract(manifest) {
  return manifest.components.map((component) => ({
    name: component.name,
    capability_families: component.capability_families,
    prop_order: component.prop_order,
    props: component.props,
    events: component.events,
    semantics: component.semantics,
    usage_rules: component.usage_rules,
    accessibility: component.accessibility,
    platform_adaptations: component.platform_adaptations,
  }));
}

export async function writeArtifacts(outputDirectory, options = {}) {
  const manifest = await loadManifest(options.manifestUrl);
  const artifacts = deriveArtifacts(manifest);
  const files = new Map([
    ["openui-library.json", stableJson(artifacts.librarySpec)],
    ["typed-json-schema.json", stableJson(artifacts.typedJsonSchema)],
    ["catalog-prompt.md", artifacts.prompt],
    ["CATALOG.md", documentation(manifest)],
    ["registry.rs", rustRegistry(manifest)],
  ]);
  if (manifest.workflow_fixtures) {
    files.set("workflow-fixtures.json", stableJson(manifest.workflow_fixtures));
  }
  const adapterSource = Buffer.concat([
    await readFile(new URL("../../Cargo.toml", import.meta.url)),
    await readFile(new URL("../../Cargo.lock", import.meta.url)),
    await readFile(new URL("../../src/lib.rs", import.meta.url)),
    await readFile(new URL(options.adapterSource ?? "../../src/ui.rs", import.meta.url)),
  ]);
  const adapterSourceHash = sha256(adapterSource);
  const releaseInputs = {
    catalog_id: manifest.catalog_id,
    catalog_contract_version: manifest.catalog_contract_version,
    release_version: manifest.release_version,
    execution_profile: manifest.execution_profile,
    source: manifest.source,
    manifest_hash: sha256(stableJson(manifest)),
    schema_hash: sha256(files.get("typed-json-schema.json")),
    semantics_hash: sha256(stableJson(semanticContract(manifest))),
    openui_library_hash: sha256(files.get("openui-library.json")),
    prompt_hash: sha256(files.get("catalog-prompt.md")),
    adapter_source_hash: adapterSourceHash,
    adapter_build_id: `${options.buildPrefix ?? "ope4"}-${adapterSourceHash.slice(0, 16)}-${sha256(files.get("registry.rs")).slice(0, 8)}`,
  };
  const release = {
    ...releaseInputs,
    catalog_release_hash: sha256(stableJson(releaseInputs)),
  };
  files.set("release.json", stableJson(release));

  await mkdir(outputDirectory, { recursive: true });
  for (const [name, content] of files) {
    await writeFile(join(outputDirectory, name), content);
  }
  const sums = [...files]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, content]) => `${sha256(content)}  ${name}`)
    .join("\n");
  await writeFile(join(outputDirectory, "SHA256SUMS"), `${sums}\n`);
  return release;
}
