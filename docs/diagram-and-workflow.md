# How Diagram and Workflow work

Flowcraft has two kinds of building blocks that share one canvas:

- **Diagram**: shapes and notes for drawing flow maps (processes, decisions, sticky notes). They're visual only.
- **Workflow**: typed nodes that pass data to each other and form a pipeline that can be checked (and, in a later phase, run).

A flow can mix both. For example, you can sketch a process with shapes and put a working AI pipeline next to it, with sticky notes explaining it.

This document explains each mode from the user's side first, then how it works in the code.

---

## 1. The parts of the editor

```
┌──────────────┬──────────────────────────────────────────┬─────────────────┐
│ Node library │                 Canvas                   │  Right sidebar  │
│              │                                          │                 │
│ [Diagram]    │   shapes, workflow nodes, connections    │  Settings (only │
│ [Workflow]   │                                          │  when needed)   │
│              │                                          │  ─────────────  │
│ search       │                                          │  Chat (saved    │
│ items…       │        ( 8 nodes · 5 connections )       │  flows only)    │
└──────────────┴──────────────────────────────────────────┴─────────────────┘
```

| Part | What it does |
|---|---|
| **Node library** (left) | Two tabs, **Diagram** first and **Workflow** second. Drag an item onto the canvas, or click it to drop it in the middle (repeated clicks cascade instead of stacking). A search box filters items. A new flow opens on the tab matching the type you created. |
| **Canvas** | Pan by dragging the background, zoom with the scroll wheel or the controls. Items snap to a 10 px grid. The minimap (bottom-right) shows workflow nodes in blue and shapes in grey. |
| **Status pill** (bottom-centre) | "8 nodes · 5 connections", or "2 of 8 selected" while several things are selected. For workflows it adds **✓ Ready to run** or **N issues**. |
| **Settings** (right) | Appear only when there's something to show: the selected item's settings, or the problems stopping a workflow from running. In the playground and on public links they float over the canvas instead of taking a column. |
| **Chat** (right, saved flows) | Team messages, with the changes people make shown as small lines in between. |

### Things that work the same in both modes
- **Select:** click an item. Shift+click or drag a box to select several.
- **Delete:** press Delete or Backspace, or right-click → **Delete node**.
- **Undo / redo:** Ctrl+Z / Ctrl+Shift+Z. This only undoes *your* edits, never a collaborator's.
- **Disconnect:** right-click a line → **Disconnect**, or right-click an item → **Disconnect all**.
- **Export / import:** the top-bar buttons save or load the whole flow as JSON.
- **Saving:** automatic. See [§5](#5-saving-collaboration-and-history).

---

## 2. Diagram mode

### The shapes

| Library item | Shape | Default size | Typical use |
|---|---|---|---|
| **Process** | Rectangle | 160 × 80 | A step or action |
| **Start / end** | Pill (rounded) | 160 × 64 | Where a flow begins or ends |
| **Decision** | Diamond | 140 × 140 | A yes/no branch ("Worth it?") |
| **Event** | Ellipse | 140 × 90 | Something that happens |
| **Sticky note** | Yellow note | 180 × 160 | Comments and explanations |
| **Text label** | Plain text, no border | 160 × 40 | Titles and captions |

Process, Start / end, Decision and Event are under **Shapes**; Sticky note and Text label are under **Annotate**.

### Working with shapes
- **Edit the text:** double-click a shape, type, then click away or press Esc.
- **Resize:** select the shape and drag the handles on its border.
- **Style:** with a shape selected, the settings panel has **Label**, **Fill**, **Border** and **Text** colour. Each colour has a picker and a hex field.
- **Connect:** hover a shape to reveal a dot on each of its four sides. Drag from any dot to any dot on another shape. Lines are animated, with an arrow at the end.

### Rules
- Shapes can connect to other shapes from any side, in any direction.
- A shape **can't** connect to a workflow node. Diagrams and workflows share the canvas but not connections, so a sketch can never break a pipeline.
- Diagrams are never "validated"; there's nothing to run.

---

## 3. Workflow mode

A workflow is a pipeline: data starts at **Input** nodes, flows through processing nodes, and ends at **Output** nodes. Every connection carries a typed value.

### The nodes

| Node | Settings | Inputs (left) | Outputs (right) |
|---|---|---|---|
| **Input** | Name, Type (`text` or `file`) | none | one, named after the node, of the chosen type |
| **Text** | Template (e.g. `Write a poem about {{topic}}`) | one per `{{variable}}` in the template | `text` |
| **LLM** | Model (Claude Sonnet / Opus / Haiku), System prompt, Prompt, Temperature (0–1) | one per `{{variable}}` in the system prompt or prompt | `response` (text) |
| **Output** | Name, Type (`text` or `image`) | one, **required**, of the chosen type | none |

The main text field of each node (Name, Template or Prompt) can be edited directly on the canvas; every setting is also in the settings panel.

**Temperature** controls how predictable the LLM's answers are: 0 gives near-identical, focused answers, and 1 gives varied, creative ones.

### Variables become inputs
Type `{{name}}` in a Text or LLM node and a matching input port appears on the left of the node straight away. Remove the variable and the port goes away. Variable names follow JavaScript identifier rules (`topic`, `user_name`, `$x`), and spaces inside the braces are allowed (`{{ topic }}`).

### Connecting nodes
Drag from an **output** dot (right side) to an **input** dot (left side). Dragging the other way works too; it's flipped automatically. A connection is refused unless:

1. **The types are compatible.** The same type connects (`text` → `text`), and `any` connects to everything. For example, an Input of type `file` can't feed an Output of type `image`.
2. **The input is free.** Each input takes exactly one connection; an output can feed many inputs.
3. **It isn't a loop onto itself.** A node can't connect to itself.

Port dots are colour-coded by type:

| Type | Colour |
|---|---|
| `any` | grey |
| `text` | teal |
| `json` | violet |
| `file` | amber |
| `image` | pink |

### Run check
Whenever the flow contains workflow nodes, it's checked continuously. If anything would stop it from running, the settings panel lists the problems (e.g. *Text: Input "topic" isn't connected*) and clicking one jumps to that node. The status pill shows **✓ Ready to run** or **N issues**.

| Problem | Meaning |
|---|---|
| Input isn't connected | A required input (an Output's value, or any `{{variable}}`) has nothing plugged in |
| Part of, or depends on, a cycle | Connections form a loop, so there's no order to run in |
| Can't send X into Y | Mismatched types (normally prevented while connecting, but it can happen after editing a node's type) |
| Port that doesn't exist | A connection's port vanished, e.g. a `{{variable}}` was deleted while still connected |
| Node can't connect to itself | A self-loop |

### Execution
Running workflows isn't built yet; it's the headline of **v2** (see the [roadmap](../README.md#roadmap)). The groundwork is in place: the run check already computes the **execution order** (a topological sort), and `interpolate()` already fills `{{variables}}` with values. A run will walk the nodes in that order, pass each output along its connections, and call the chosen AI model (free built-in AI or your own key) for LLM nodes.

---

## 4. Mixing both on one canvas

- The **node library tab** only decides which items you see. Any flow can hold both kinds.
- The **run check ignores shapes and their connections**, so annotating a workflow never breaks it.
- The playground's starter flow shows both: a working Input → Text → LLM → Output pipeline, a sticky note, and a small Start → Decision → Process diagram.

---

## 5. Saving, collaboration and history

| What | How it behaves |
|---|---|
| **Autosave** | Edits apply locally at once, go to the server in 300 ms batches, and are written to the database 2 s after the last edit (at least every 10 s while someone keeps editing). The top bar shows **Saved**, and only says **Saving…** if a save is slow. |
| **Live editing** | Everyone in a flow sees each other's edits, cursors (with names) and selections (a coloured outline on the node) in real time. |
| **Roles** | **Owner** (everything, including sharing and deleting), **Editor** (edit), **Viewer** (look and chat; the canvas is read-only). |
| **Chat** | Messages, plus a line for each change, e.g. *Ada deleted “input” (Input)*. Long runs of changes collapse to "+N more". |
| **Version history** | Save named versions, and automatic snapshots are taken every 10 minutes while people edit. **Restore** is an ordinary edit, so Ctrl+Z undoes it and everyone sees it. |
| **Playground** | No account needed; the flow is saved only in your browser. |

---

## 6. Under the hood

### One definition per node type
Every node type, shape or workflow node, is a single `defineNode({...})` call in `packages/node-registry/src/nodes/`:

```ts
defineNode({
  type: "text",
  mode: "workflow",               // which library tab, and diagram vs workflow behaviour
  category: "Transform",          // heading in the library
  label: "Text",
  description: "A template; each {{variable}} becomes an input",
  icon: "Type",
  configSchema: z.object({        // settings, with defaults and types (Zod)
    template: field(z.string().default(""), { label: "Template", widget: "textarea", inline: true }),
  }),
  ports: (c) => ({                // computed from the current settings
    inputs: variablePorts(c.template),
    outputs: [{ id: "text", dataType: "text" }],
  }),
});
```

Everything else reads these definitions: the library, the node's look on the canvas, the settings form (generated from the schema), connection rules and the run check. **Adding a node type means adding one entry**; no UI code changes.

Diagram shapes have no `ports` (they don't take part in validation) and add a `shape` and a `defaultSize` instead.

### How the pieces fit

| Concern | Where | What it does |
|---|---|---|
| Graph storage | `apps/web/lib/flow-doc.ts` | Nodes and connections live in a Yjs document, which merges concurrent edits. React state mirrors it, plus private UI state (selection, dragging). |
| Rendering | `components/editor/WorkflowNode.tsx`, `ShapeNode.tsx` | Workflow nodes draw a header, inline field and port rows. Shapes draw the shape, label, resize handles and four side dots. |
| Connection rules | `apps/web/lib/connections.ts` | `normalizeConnection()` decides whether a connection is allowed and flips input→output drags. |
| `{{variables}}` | `packages/flow-engine/src/interpolate.ts` | `extractVariables()` finds the ports; `interpolate()` fills in values. |
| Run check | `packages/flow-engine/src/validate.ts`, `topo.ts` | Checks ports, types, required inputs and cycles; returns the problems and the execution order. |
| Settings panel | `components/editor/Inspector.tsx` | `describeFields()` turns a schema into form fields (text, textarea, select, slider, colour). |
| Sync, chat, history | `apps/collab`, `apps/web/server` | The real-time server, attribution of who changed what, and versions. |

### The life of a `{{variable}}`
1. You type `{{topic}}` into a Text node. The inline field writes the new template into the shared document.
2. The node re-renders and its definition's `ports()` runs `extractVariables()` on the template, which now returns `["topic"]`.
3. A new input port `var:topic` (type `any`, required) appears, and React Flow is told to re-measure the node's handles.
4. The run check re-runs. The port is required but unconnected, so the status pill shows **1 issue** until you connect something to it.
5. Collaborators get the same change through the shared document and see the port appear too.
