import type { DataType } from "@flowcraft/flow-engine";
import { defaultConfig, type NodeDefinition } from "@flowcraft/node-registry";

/**
 * Look-alike workflow nodes for the tour's canvas demos. They're plain DOM
 * (styled like WorkflowNode) so the tour never touches the user's real flow.
 */

const portColor: Record<DataType, string> = {
  any: "var(--color-port-any)",
  text: "var(--color-port-text)",
  json: "var(--color-port-json)",
  file: "var(--color-port-file)",
  image: "var(--color-port-image)",
};

function div(className: string, text?: string) {
  const el = document.createElement("div");
  el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export interface MockPort {
  label: string;
  type: DataType;
}

export interface MockNode {
  root: HTMLElement;
  /** The inline text field. */
  field: HTMLElement;
  ports: HTMLElement;
  addPort(port: MockPort, side: "in" | "out"): { row: HTMLElement; handle: HTMLElement };
  handle(label: string): HTMLElement;
}

export function mockNode(title: string, opts: { text?: string; inputs?: MockPort[]; outputs?: MockPort[] }): MockNode {
  const root = div("w-[240px] rounded-xl border border-line bg-panel/95 shadow-2xl shadow-black/40 text-fg");
  const header = div("flex items-center gap-2 rounded-t-xl border-b border-line bg-raised/60 px-3 py-2");
  header.append(div("size-2 rounded-full bg-accent"), div("text-sm font-medium", title));

  const fieldWrap = div("p-3");
  const field = div(
    "min-h-10 whitespace-pre-wrap rounded-md border border-line bg-bg px-2.5 py-2 font-mono text-[13px] text-fg",
    opts.text ?? "",
  );
  fieldWrap.append(field);

  const ports = div("border-t border-line py-1.5");
  const handles = new Map<string, HTMLElement>();

  const addPort = (port: MockPort, side: "in" | "out") => {
    const row = div(`relative flex items-center gap-2 px-3 py-1 text-xs ${side === "out" ? "justify-end" : ""}`);
    const handle = div(
      `absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-panel ${side === "in" ? "-left-1.5" : "-right-1.5"}`,
    );
    handle.style.background = portColor[port.type];
    row.append(handle, div("text-fg/90", port.label), div("font-mono text-[10px] text-muted", port.type));
    // Inputs are listed before outputs, as on the real node.
    const firstOutput = ports.querySelector("[data-side=out]");
    row.dataset.side = side;
    if (side === "in" && firstOutput) ports.insertBefore(row, firstOutput);
    else ports.append(row);
    handles.set(port.label, handle);
    return { row, handle };
  };

  for (const p of opts.inputs ?? []) addPort(p, "in");
  for (const p of opts.outputs ?? []) addPort(p, "out");

  root.append(header, fieldWrap, ports);
  return { root, field, ports, addPort, handle: (label) => handles.get(label)! };
}

/** A palette entry as it looks while being dragged. */
export function mockPaletteItem(label: string) {
  const root = div("flex w-56 items-center gap-2.5 rounded-lg border border-accent/60 bg-raised px-2 py-2 shadow-xl shadow-black/40");
  const icon = div("grid size-8 place-items-center rounded-md bg-bg font-mono text-sm text-accent", label[0]);
  root.append(icon, div("text-sm text-fg", label));
  return root;
}

/** A diagram shape at its default size and colours, as it looks right after being dropped. */
export function mockShape(definition: NodeDefinition) {
  const { width, height } = definition.defaultSize ?? { width: 160, height: 80 };
  const config = defaultConfig(definition) as { label: string; fill: string; stroke: string; textColor: string };
  const shape = definition.shape;
  const root = div(
    `grid place-items-center border-2 p-3 text-center text-sm ${
      shape === "rounded" || shape === "ellipse" ? "rounded-full" : shape === "sticky" ? "rounded-sm" : "rounded-md"
    } ${shape === "diamond" ? "rotate-45" : ""}`,
  );
  root.style.width = `${shape === "diamond" ? width * 0.7 : width}px`;
  root.style.height = `${shape === "diamond" ? height * 0.7 : height}px`;
  root.style.background = config.fill;
  root.style.borderColor = shape === "sticky" || shape === "label" ? "transparent" : config.stroke;
  root.style.color = config.textColor;
  if (shape !== "diamond") root.textContent = config.label || definition.label;
  return root;
}
