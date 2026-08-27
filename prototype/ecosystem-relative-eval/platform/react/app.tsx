import { createRenderer, useBoundProp } from "@json-render/react";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { jsonRenderCatalog } from "../../src/json-render-catalog.mjs";

type JsonRenderEntry = {
  cohort: string;
  schedule_scenario_id: string;
  scenario_id: string;
  family: string;
  spec: Record<string, unknown>;
};

declare const __OPE11_JSON_RENDER_FIXTURE__: {
  provenance: {
    manifest_hash: string;
    binding_sha256: string;
  };
  entries?: JsonRenderEntry[];
  cohort?: string;
  schedule_scenario_id?: string;
  scenario_id?: string;
  family?: string;
  spec?: Record<string, unknown>;
};

const fixture = __OPE11_JSON_RENDER_FIXTURE__;
const completeScope = Array.isArray(fixture.entries);
const entries: JsonRenderEntry[] = fixture.entries ?? [{
  cohort: fixture.cohort!,
  schedule_scenario_id: fixture.schedule_scenario_id!,
  scenario_id: fixture.scenario_id!,
  family: fixture.family!,
  spec: fixture.spec!,
}];

type ComponentContext = {
  props: Record<string, any>;
  children?: React.ReactNode;
  emit: (event: string) => void;
  bindings?: Record<string, string>;
};

type NativeComponentContext = Omit<ComponentContext, "props"> & {
  element: { props: Record<string, any> };
};

function withProps(render: (context: ComponentContext) => React.ReactNode) {
  return ({ element, ...context }: NativeComponentContext) => render({ ...context, props: element.props });
}

const components = {
  Label: withProps(({ props }: ComponentContext) => <label id={props.id} htmlFor={props.for_id} data-component="Label">{props.text}</label>),
  Toolbar: withProps(({ props, children }: ComponentContext) => <div id={props.id} role="toolbar" aria-label="Generated interface" aria-orientation={props.orientation} data-component="Toolbar" data-orientation={props.orientation}>{children}</div>),
  Avatar: withProps(({ props }: ComponentContext) => <div id={props.id} role="img" aria-label={props.alt} data-component="Avatar">{props.fallback}</div>),
  Input: withProps(({ props, bindings }: ComponentContext) => {
    const [value, setValue] = useBoundProp<string>(props.value, bindings?.value);
    return <label>{props.label}<input id={props.id} data-component="Input" data-state-key={props.state_key} value={value ?? ""} placeholder={props.placeholder} onChange={(event) => setValue(event.target.value)} /></label>;
  }),
  Select: withProps(({ props, bindings }: ComponentContext) => {
    const [value, setValue] = useBoundProp<string>(props.value, bindings?.value);
    return <label>{props.label}<select id={props.id} data-component="Select" data-state-key={props.state_key} value={value ?? ""} onChange={(event) => setValue(event.target.value)}>{props.options.map((option: string) => <option key={option} value={option}>{option}</option>)}</select></label>;
  }),
  Checkbox: withProps(({ props, bindings }: ComponentContext) => {
    const [checked, setChecked] = useBoundProp<boolean>(props.checked, bindings?.checked);
    return <label><input id={props.id} type="checkbox" data-component="Checkbox" data-state-key={props.state_key} checked={Boolean(checked)} onChange={(event) => setChecked(event.target.checked)} />{props.label}</label>;
  }),
  Switch: withProps(({ props, bindings }: ComponentContext) => {
    const [checked, setChecked] = useBoundProp<boolean>(props.checked, bindings?.checked);
    return <button id={props.id} type="button" role="switch" aria-checked={Boolean(checked)} data-component="Switch" data-state-key={props.state_key} onClick={() => setChecked(!checked)}>{props.label}</button>;
  }),
  Button: withProps(({ props, emit }: ComponentContext) => <button id={props.id} type="button" data-component="Button" onClick={() => emit("press")}>{props.label}</button>),
  Tabs: withProps(({ props, children }: ComponentContext) => <div id={props.id} role="tablist" data-component="Tabs" data-state-key={props.state_key}>{children}</div>),
  Dialog: withProps(({ props, children }: ComponentContext) => <section id={props.id} role="dialog" aria-label={props.title} data-component="Dialog" data-state-key={props.open_state_key}><h2>{props.title}</h2>{children}</section>),
  Progress: withProps(({ props }: ComponentContext) => <progress id={props.id} aria-label={props.label} data-component="Progress" value={props.value} max={props.max} />),
  Toast: withProps(({ props }: ComponentContext) => <div id={props.id} role="status" aria-live="polite" data-component="Toast" data-tone={props.tone}><strong>{props.title}</strong>{props.message}</div>),
} as any;

const OfficialRenderer = createRenderer(jsonRenderCatalog as any, components);
const allowedActions = new Set(["SubmitProfile", "ApplyFilter"]);

function App() {
  const [current, setCurrent] = useState(0);
  const entry = entries[current];
  return <RenderedEntry key={`${entry.scenario_id}-${current}`} entry={entry} current={current} setCurrent={setCurrent} completeScope={completeScope} />;
}

function RenderedEntry({ entry, current, setCurrent, completeScope }: { entry: JsonRenderEntry; current: number; setCurrent: (index: number) => void; completeScope: boolean }) {
  const [stateChanged, setStateChanged] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const [receipt, setReceipt] = useState("ready");
  const [runtimeState, setRuntimeState] = useState<Record<string, unknown>>((entry.spec as any).state ?? {});
  const complete = stateChanged && actionCount === 1;
  const mutateRuntimeState = () => {
    const key = Object.keys(runtimeState)[0];
    if (!key) throw new Error("state probe requires one state key");
    const value = runtimeState[key];
    const next = typeof value === "boolean" ? !value : typeof value === "number" ? value + 1 : `${String(value)}-changed`;
    setRuntimeState({ ...runtimeState, [key]: next });
    setStateChanged(true);
  };
  return (
    <main
      id="react-eval-root"
      data-route="json-render"
      data-scenario-id={entry.scenario_id}
      data-schedule-scenario-id={entry.schedule_scenario_id}
      data-cohort={entry.cohort}
      data-surface-count={String(entries.length)}
      data-current-index={String(current)}
      data-complete-scope={String(completeScope)}
      data-official-seam="official-react-web"
      data-manifest-hash={fixture.provenance.manifest_hash}
      data-binding-sha256={fixture.provenance.binding_sha256}
      data-probe-complete={String(complete)}
      data-action-count={String(actionCount)}
    >
      <h1>json-render native React evaluation</h1>
      <OfficialRenderer
        spec={entry.spec as any}
        state={runtimeState}
        onStateChange={(changes: { path: string; value: unknown }[]) => {
          setRuntimeState((currentState) => applyStateChanges(currentState, changes));
          setStateChanged(true);
        }}
        onAction={(name: string, params: Record<string, unknown> = {}) => {
          if (!allowedActions.has(name) || typeof params.target_id !== "string") throw new Error("action denied");
          setActionCount((current) => current + 1);
          setReceipt(`receipt:${name}:${params.target_id}`);
        }}
      />
      {completeScope ? <button type="button" data-probe-step="state" onClick={mutateRuntimeState}>Change state</button> : null}
      <p role="status" aria-live="polite" data-receipt={receipt}>{receipt}</p>
      <nav aria-label="json-render surface navigation">
        <button type="button" disabled={current === 0} onClick={() => setCurrent(Math.max(0, current - 1))}>Previous Surface</button>
        <button type="button" disabled={current + 1 >= entries.length} onClick={() => setCurrent(Math.min(entries.length - 1, current + 1))}>Next Surface</button>
      </nav>
    </main>
  );
}

function applyStateChanges(current: Record<string, unknown>, changes: { path: string; value: unknown }[]) {
  const next = { ...current };
  for (const change of changes) {
    const match = change.path.match(/^\/([^/]+)$/);
    if (!match) throw new Error(`unsupported state path: ${change.path}`);
    const key = match[1].replaceAll("~1", "/").replaceAll("~0", "~");
    if (!(key in next)) throw new Error(`unknown state path: ${change.path}`);
    next[key] = change.value;
  }
  return next;
}

createRoot(document.getElementById("app")!).render(<App />);
