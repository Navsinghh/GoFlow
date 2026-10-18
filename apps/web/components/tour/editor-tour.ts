import { getDefinition } from "@flowcraft/node-registry";
import { mockNode, mockPaletteItem, mockShape } from "./mocks";
import type { Placement } from "./placement";
import { centerOf, type Point, type Stage } from "./stage";

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** `data-tour` id of the element to spotlight. */
  target?: string;
  /** Element to place the card against, when it shouldn't sit next to the spotlight. */
  cardTarget?: string;
  placement: Placement;
  /** Demonstration played (and looped) while the step is open. */
  play?: (stage: Stage) => Promise<void>;
}

/** Adds `el` to the ghost layer, centred on `at`. */
function mount(stage: Stage, el: HTMLElement, at: Point) {
  const host = stage.ghost("pointer-events-none", at);
  host.append(el);
  host.style.left = `${at.x - host.offsetWidth / 2}px`;
  host.style.top = `${at.y - host.offsetHeight / 2}px`;
  return host;
}

function canvasCenter(stage: Stage): Point {
  return centerOf(stage.rect("canvas")!);
}

function pulse(stage: Stage, el: HTMLElement) {
  return stage
    .animate(el, [{ boxShadow: "0 0 0 0 rgb(0 163 255 / 0.7)" }, { boxShadow: "0 0 0 10px rgb(0 163 255 / 0)" }], {
      duration: 700,
      iterations: 2,
      fill: "none",
    })
    .catch(() => {});
}

export const editorTour: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Flowcraft",
    body: "Build flow maps and AI workflows on one canvas. This quick tour shows you around. It takes about a minute.",
    placement: "center",
  },
  {
    id: "add-node",
    title: "Add a node",
    body: "Drag any node from the library onto the canvas, or just click it to drop it in the middle.",
    target: "palette",
    // Keep the card out of the drag path, below the drop point.
    cardTarget: "canvas",
    placement: "inside-bottom",
    async play(s) {
      // Demonstrate with whatever is first in the library's current tab.
      const item = s.target("palette")?.querySelector<HTMLElement>("[data-tour^='node-']") ?? null;
      if (!item) return;
      const definition = getDefinition(item.dataset.tour!.slice("node-".length));
      const label = item.dataset.label ?? "Text";
      const from = item.getBoundingClientRect();
      const drop = canvasCenter(s);

      await s.moveTo({ x: from.left + 48, y: from.top + from.height / 2 });
      await s.press(true);
      const card = s.ghost("pointer-events-none", { x: from.left, y: from.top });
      card.append(mockPaletteItem(label));
      await s.appear(card, 150);

      const delta = { x: drop.x - s.position.x, y: drop.y - s.position.y };
      await Promise.all([
        s.moveTo(drop, 1100),
        s.animate(card, [{ transform: "translate(0, 0)" }, { transform: `translate(${delta.x}px, ${delta.y}px)` }], {
          duration: 1100,
        }),
      ]);
      await s.press(false);

      const dropped =
        definition?.mode === "diagram" ? mockShape(definition) : mockNode(label, { outputs: [{ label: "out", type: "text" }] }).root;
      const host = mount(s, dropped, drop);
      await Promise.all([s.animate(card, [{ opacity: 1 }, { opacity: 0 }], { duration: 150 }), s.appear(host)]);
      await s.sleep(1000);
    },
  },
  {
    id: "variables",
    title: "Variables become inputs",
    body: "Type {{name}} in a Text or LLM node and a matching input port appears on the left. Delete it and the port goes away.",
    // The canvas stays dimmed so the demo nodes stand out from the real ones.
    cardTarget: "canvas",
    placement: "inside-bottom",
    async play(s) {
      const center = canvasCenter(s);
      const node = mockNode("Text", { outputs: [{ label: "text", type: "text" }] });
      const host = mount(s, node.root, { x: center.x, y: center.y - 60 });
      await s.appear(host);

      const field = node.field.getBoundingClientRect();
      await s.moveTo({ x: field.left + 24, y: field.top + field.height / 2 });
      await s.click();
      node.field.classList.replace("border-line", "border-accent");

      let port: HTMLElement | null = null;
      await s.type(node.field, "Summarise {{article}}", (typed) => {
        if (port || !typed.endsWith("}}")) return;
        const added = node.addPort({ label: "article", type: "any" }, "in");
        port = added.handle;
        void s.appear(added.row, 220).catch(() => {});
      });
      if (port) {
        await s.sleep(250);
        await s.moveTo(centerOf((port as HTMLElement).getBoundingClientRect()), 600);
        await pulse(s, port);
      }
      await s.sleep(700);
    },
  },
  {
    id: "connect",
    title: "Connect the dots",
    body: "Drag from an output (right) to an input (left). Only compatible types connect. To undo a connection, right-click the line (or a node) and choose Disconnect.",
    // The canvas stays dimmed so the demo nodes stand out from the real ones.
    cardTarget: "canvas",
    placement: "inside-bottom",
    async play(s) {
      const center = canvasCenter(s);
      const a = mockNode("Input", { text: "article", outputs: [{ label: "value", type: "text" }] });
      const b = mockNode("Text", {
        text: "Summarise {{article}}",
        inputs: [{ label: "article", type: "any" }],
        outputs: [{ label: "text", type: "text" }],
      });
      const hostA = mount(s, a.root, { x: center.x - 170, y: center.y - 60 });
      const hostB = mount(s, b.root, { x: center.x + 170, y: center.y - 60 });
      await Promise.all([s.appear(hostA), s.appear(hostB)]);

      const p1 = centerOf(a.handle("value").getBoundingClientRect());
      const p2 = centerOf(b.handle("article").getBoundingClientRect());
      await s.moveTo(p1);
      await s.press(true);

      const svg = s.svg();
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const bend = Math.max(60, Math.abs(p2.x - p1.x) / 2);
      path.setAttribute("d", `M ${p1.x} ${p1.y} C ${p1.x + bend} ${p1.y}, ${p2.x - bend} ${p2.y}, ${p2.x} ${p2.y}`);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "var(--color-accent)");
      path.setAttribute("stroke-width", "2");
      svg.append(path);
      const length = path.getTotalLength();
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;

      await Promise.all([
        s.moveTo(p2, 1000),
        s.animate(path, [{ strokeDashoffset: length }, { strokeDashoffset: 0 }], { duration: 1000 }),
      ]);
      await s.press(false);
      await Promise.all([pulse(s, a.handle("value")), pulse(s, b.handle("article"))]);
      await s.sleep(600);
    },
  },
  {
    id: "inspector",
    title: "Settings appear when you need them",
    body: "Click a node and its settings open on the right. If a workflow can't run yet, the problems show up there too, and each one jumps to its node. Saved flows also keep a team chat in this column.",
    target: "inspector",
    placement: "left",
    async play(s) {
      // The inspector only exists while there's something to show, so fall back to the canvas.
      const r = s.rect("inspector") ?? s.rect("canvas");
      if (!r) return;
      await s.moveTo({ x: r.left + r.width / 2, y: r.top + 130 });
      await s.sleep(500);
      await s.moveTo({ x: r.left + 90, y: r.top + 210 }, 600);
      await s.sleep(1400);
    },
  },
  {
    id: "diagram",
    title: "Diagrams too",
    body: "Switch to Diagram for shapes and sticky notes. They share the canvas with workflows, so you can annotate as you build.",
    target: "tab-diagram",
    placement: "right",
    async play(s) {
      const tab = s.rect("tab-diagram")!;
      await s.moveTo(centerOf(tab));
      await s.click();

      const center = canvasCenter(s);
      const shapes = [
        { at: { x: center.x - 200, y: center.y }, cls: "grid h-14 w-36 place-items-center rounded-full border-2 border-[#5b6b8c] bg-[#173a36] text-sm text-fg", text: "Start" },
        { at: { x: center.x, y: center.y }, cls: "grid size-24 rotate-45 place-items-center border-2 border-[#5b6b8c] bg-[#3a2a17]", text: "" },
        { at: { x: center.x + 200, y: center.y }, cls: "h-28 w-36 rounded-sm bg-[#e8c547] p-3 text-sm text-[#2b2205] shadow-lg shadow-black/40", text: "Ask legal first" },
      ];
      for (const shape of shapes) {
        const el = document.createElement("div");
        el.className = shape.cls;
        el.textContent = shape.text;
        await s.appear(mount(s, el, shape.at), 260);
        await s.sleep(120);
      }
      await s.sleep(1500);
    },
  },
  {
    id: "toolbar",
    title: "Undo, export, relax",
    body: "Undo with Ctrl+Z (Ctrl+Shift+Z to redo), and export or import a flow as JSON. Changes save automatically.",
    target: "toolbar",
    placement: "bottom",
    async play(s) {
      const undo = s.rect("undo");
      const exportButton = s.rect("export");
      if (undo) {
        await s.moveTo(centerOf(undo));
        await s.click();
      }
      if (exportButton) {
        await s.sleep(400);
        await s.moveTo(centerOf(exportButton), 500);
      }
      await s.sleep(1400);
    },
  },
  {
    id: "done",
    title: "You're all set",
    body: "Replay this tour any time from the ? button. Now go build something.",
    target: "help",
    placement: "bottom",
    async play(s) {
      const help = s.rect("help");
      if (help) await s.moveTo(centerOf(help));
      await s.click();
      await s.sleep(2000);
    },
  },
];
