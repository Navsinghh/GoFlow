# Flowcraft

Diagrams and executable AI workflows on one canvas.

## Stack

Next.js 16 · React 19 · TypeScript (strict) · React Flow (`@xyflow/react` 12) · Yjs · Tailwind CSS 4 · Zod 4 · Vitest · Turborepo + pnpm

## Layout

```
apps/web                  Next.js app (landing page, /playground editor)
packages/flow-engine      Pure TS: graph validation, topological sort, {{variable}} interpolation
packages/node-registry    Every node type as one typed definition (Zod config schema + ports)
```

### How it fits together

- **Node registry.** A node is one `defineNode({ type, mode, configSchema, ports })` call. The canvas component, inspector form, connection rules and validation all derive from that definition, so adding a node type means adding one entry.
- **Flow document.** The graph lives in a Yjs `Y.Doc` (`apps/web/lib/flow-doc.ts`). React holds a projection of it plus per-user UI state (selection, drag, measured size). Undo/redo uses `Y.UndoManager`, scoped to the local user's edits. The playground persists to IndexedDB. The same document will sync over Liveblocks for multiplayer.
- **Validation.** `validate()` checks for cycles, port type mismatches, unconnected required inputs and dangling edges. Diagram shapes are ignored, so annotations can share a canvas with a workflow.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # unit tests
pnpm typecheck
pnpm build
```

## Roadmap

1. ✅ Foundation: monorepo, typed registry, engine, Yjs-backed editor
2. Accounts & saved flows: Better Auth (magic link, Google, GitHub), Postgres + Drizzle, dashboard
3. Real-time collaboration: Liveblocks rooms, cursors, sharing, version history
4. Diagram mode: more shapes, styling, ELK auto-layout, PNG/SVG/Mermaid export
5. Workflow execution: Inngest durable runs, streaming Claude LLM nodes, run history
6. AI: generate a flow from a prompt, templates, command palette
