import { createRenderer, useBoundProp } from "@json-render/react";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";

import { jsonRenderCatalog } from "../../src/json-render-catalog.mjs";

declare const __OPE11_JSON_RENDER_FIXTURE__: {
  provenance: {
    manifest_hash: string;
    binding_sha256: string;
  };
  scenario_id: string;
  family: string;
  spec: Record<string, unknown>;
};

const fixture = __OPE11_JSON_RENDER_FIXTURE__;

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
  Toolbar: withProps(({ props, children }: ComponentContext) => <div id={props.id} role="toolbar" data-component="Toolbar" data-orientation={props.orientation}>{children}</div>),
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
  Toast: withProps(({ props }: ComponentContext) => <div id={props.id} role="status" data-component="Toast" data-tone={props.tone}><strong>{props.title}</strong>{props.message}</div>),
} as any;

const OfficialRenderer = createRenderer(jsonRenderCatalog as any, components);
const allowedActions = new Set(["SubmitProfile", "ApplyFilter"]);

function App() {
  const [stateChanged, setStateChanged] = useState(false);
  const [actionCount, setActionCount] = useState(0);
  const [receipt, setReceipt] = useState("ready");
  const complete = stateChanged && actionCount === 1;
  return (
    <main
      id="react-eval-root"
      data-route="json-render"
      data-official-seam="official-react-web"
      data-manifest-hash={fixture.provenance.manifest_hash}
      data-binding-sha256={fixture.provenance.binding_sha256}
      data-probe-complete={String(complete)}
      data-action-count={String(actionCount)}
    >
      <h1>json-render native React canary</h1>
      <OfficialRenderer
        spec={fixture.spec as any}
        state={(fixture.spec as any).state}
        onStateChange={() => setStateChanged(true)}
        onAction={(name: string, params: Record<string, unknown> = {}) => {
          if (!allowedActions.has(name) || typeof params.target_id !== "string") throw new Error("action denied");
          setActionCount((current) => current + 1);
          setReceipt(`receipt:${name}:${params.target_id}`);
        }}
      />
      <p role="status" aria-live="polite" data-receipt={receipt}>{receipt}</p>
    </main>
  );
}

createRoot(document.getElementById("app")!).render(<App />);
