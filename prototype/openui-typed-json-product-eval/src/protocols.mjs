import { createParser } from "@openuidev/lang-core";
import Ajv2020 from "ajv/dist/2020.js";

import {
  deriveArtifacts,
  flattenOpenUiTree,
  loadManifest,
} from "../../dioxus-components-catalog-eval/generator/src/catalog-generator.mjs";

const manifest = await loadManifest();
const artifacts = deriveArtifacts(manifest);
const parser = createParser(artifacts.librarySpec.schema, artifacts.librarySpec.root);
const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addFormat("component-ref", true);
ajv.addFormat("component-id-ref", true);
const validateJsonSchema = ajv.compile(artifacts.typedJsonSchema);

export const protocolArtifacts = { manifest, artifacts };

const sharedRules = [
  "Use only the frozen catalog components, ordered props, state keys, actions, and usage rules supplied below.",
  "Preserve all scenario values exactly. Never invent a component, property, state key, action, or host effect.",
  "The output is inert data: return only the protocol payload and never executable code.",
].join("\n");

export function protocolPrompt(protocol) {
  if (protocol === "openui") {
    return `${sharedRules}\n\nOPENUI SYNTAX AND CATALOG\n${artifacts.prompt}`;
  }
  if (protocol === "typed-json") {
    const descriptions = manifest.components.map((component) => [
      `${component.name}(${component.prop_order.join(", ")}) — ${component.description}`,
      ...component.usage_rules.map((rule) => `- ${rule}`),
    ].join("\n")).join("\n\n");
    return [
      sharedRules,
      "TYPED JSON SYNTAX AND CATALOG",
      "Return one strict JSON object with root, nodes, and state. Structural component values are stable component ids.",
      descriptions,
      "STRICT JSON SCHEMA",
      JSON.stringify(artifacts.typedJsonSchema),
    ].join("\n\n");
  }
  throw new Error(`unknown protocol: ${protocol}`);
}

export function validateProtocol(protocol, source, expectedState) {
  if (protocol === "openui") {
    try {
      const parse = parser.parse(source);
      const diagnostics = [
        ...parse.meta.errors,
        ...parse.meta.unresolved.map((name) => ({ code: "unresolved", message: name })),
        ...parse.meta.orphaned.map((name) => ({ code: "orphaned", message: name })),
        ...(parse.meta.incomplete ? [{ code: "incomplete", message: "program is incomplete" }] : []),
        ...(!parse.root ? [{ code: "missing-root", message: "no root component" }] : []),
      ];
      return {
        ok: diagnostics.length === 0,
        diagnostics,
        wire: diagnostics.length === 0 ? flattenOpenUiTree(parse.root, expectedState) : null,
      };
    } catch (error) {
      return failure("parse-exception", error);
    }
  }
  try {
    const wire = typedJsonToWire(JSON.parse(stripFence(source)));
    const ok = validateJsonSchema(wire);
    return {
      ok: Boolean(ok),
      diagnostics: ok ? [] : (validateJsonSchema.errors ?? []).map((error) => ({
        code: error.keyword,
        path: error.instancePath,
        message: error.message,
      })),
      wire: ok ? wire : null,
    };
  } catch (error) {
    return failure("parse-exception", error);
  }
}

export function encodeExpected(protocol, surface) {
  return protocol === "openui" ? `root = ${encodeNode(surface.root, new Map(surface.nodes.map((node) => [node.id, node])))}` : JSON.stringify(surface);
}

export function typedJsonToWire(wire) {
  return wire;
}

export function adapterLoc() {
  return {
    openui: nonEmptyLoc(flattenOpenUiTree.toString()),
    "typed-json": nonEmptyLoc(typedJsonToWire.toString()),
  };
}

export function semanticCoverage(wire, expected) {
  const diagnostics = [];
  const actualKinds = wire.nodes.map((node) => node.kind).sort();
  const expectedKinds = expected.nodes.map((node) => node.kind).sort();
  if (JSON.stringify(actualKinds) !== JSON.stringify(expectedKinds)) diagnostics.push("component-kinds");
  if (JSON.stringify(wire.state) !== JSON.stringify(expected.state)) diagnostics.push("state");
  const expectedByKind = new Map(expected.nodes.map((node) => [node.kind, node]));
  for (const node of wire.nodes) {
    const oracle = expectedByKind.get(node.kind);
    if (!oracle || JSON.stringify(semanticProps(node)) !== JSON.stringify(semanticProps(oracle))) {
      diagnostics.push(`props:${node.kind}`);
    }
  }
  return { passed: diagnostics.length === 0, diagnostics };
}

function encodeNode(id, nodes) {
  const node = nodes.get(id);
  if (!node) throw new Error(`broken structural reference: ${id}`);
  const definition = manifest.components.find((component) => component.name === node.kind);
  if (!definition) throw new Error(`unknown component: ${node.kind}`);
  const args = definition.prop_order.map((name) => encodeValue(node[name], definition.props[name], nodes));
  return `${node.kind}(${args.join(", ")})`;
}

function encodeValue(value, schema, nodes) {
  if (schema.format === "component-ref") return encodeNode(value, nodes);
  if (schema.type === "array") return `[${value.map((item) => encodeValue(item, schema.items, nodes)).join(", ")}]`;
  if (schema.type === "object") {
    const entries = Object.entries(value).map(([key, child]) => `${key}: ${encodeValue(child, schema.properties[key], nodes)}`);
    return `{${entries.join(", ")}}`;
  }
  return JSON.stringify(value);
}

function stripFence(source) {
  const trimmed = source.trim();
  return trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1] ?? trimmed;
}

function failure(code, error) {
  return { ok: false, diagnostics: [{ code, message: String(error?.message ?? error) }], wire: null };
}

function nonEmptyLoc(source) {
  return source.split("\n").filter((line) => line.trim()).length;
}

function semanticProps(node) {
  const definition = manifest.components.find((component) => component.name === node.kind);
  return Object.fromEntries(definition.prop_order
    .filter((name) => name !== "id" && !containsComponentRef(definition.props[name]))
    .map((name) => [name, node[name]]));
}

function containsComponentRef(schema) {
  if (["component-ref", "component-id-ref"].includes(schema.format)) return true;
  if (schema.type === "array") return containsComponentRef(schema.items);
  if (schema.type === "object") return Object.values(schema.properties ?? {}).some(containsComponentRef);
  return false;
}
