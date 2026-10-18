# Flowcraft

Diagrams and executable AI workflows on one canvas.

## Stack

Next.js 16 · React 19 · TypeScript (strict) · React Flow (`@xyflow/react` 12) · Yjs · tRPC 11 + TanStack Query · Better Auth · Hocuspocus (self-hosted Yjs sync) · Postgres + Drizzle · Tailwind CSS 4 · Zod 4 · Vitest · Turborepo + pnpm

## Layout

```
apps/web                  Next.js app: landing, sign-in, dashboard, editor, sharing, tRPC + auth API
apps/collab               Hocuspocus WebSocket server for real-time editing, presence and auto-versions
packages/db               Drizzle schema, migrations, Postgres client
packages/flow-engine      Pure TS: graph validation, topological sort, {{variable}} interpolation
packages/node-registry    Every node type as one typed definition (Zod config schema + ports)
```

### How it fits together

- **Node registry.** A node is one `defineNode({ type, mode, configSchema, ports })` call. The canvas component, inspector form, connection rules and validation all derive from that definition, so adding a node type means adding one entry.
- **Flow document.** The graph lives in a Yjs `Y.Doc` (`apps/web/lib/flow-doc.ts`). React holds a projection of it plus per-user UI state (selection, drag, measured size). Undo/redo uses `Y.UndoManager`, scoped to the local user's edits. The playground persists to IndexedDB. The same document will sync over Liveblocks for multiplayer.
- **Real-time collaboration.** Every open editor joins a Hocuspocus room named after the flow. The web app issues a short-lived JWT (`/api/flows/:id/collab-token`) that says who you are and your role. The collab server only verifies that signature, so it never touches sessions. Viewers connect read-only. Documents load from Postgres and save back (debounced) through `applyFlowUpdate`, which merges under a row lock. Presence (cursors, selections, avatars) travels over Yjs awareness and is never stored.
- **Autosave, debounced at three levels.** Edits land in the local Yjs doc instantly. They go over the network in 300 ms batches (flushed straight away if the tab is hidden or closed) and reach Postgres 2 s after the last edit, or at least every 10 s during non-stop editing. The status only says "Saving…" when a save is genuinely slow.
- **Activity & chat.** In saved flows the right sidebar is the chat. The inspector only slides in above it when there's something to show: a selected node, or problems stopping a workflow from running. Without a sidebar (the playground, public links), the inspector is a card that floats over the canvas when needed. Each flow keeps a record of who did what (nodes added or deleted, renames, shares, version saves and restores) with chat messages in between, so a discussion sits next to the changes it's about. Canvas edits are attributed on the collab server from the connection that sent them, so clients can't fake who made a change. Web-side actions are pushed to the room through an internal, secret-protected `POST /events` endpoint.
- **Sharing & history.** Owners invite people by email as editors or viewers, even before those people sign up, or turn on a view-only public link. Versions are saved by hand or automatically every 10 minutes. Restoring writes the old graph into the live document as a normal edit, so collaborators see it straight away and it can be undone.
- **Accounts.** Better Auth handles magic links and Google/GitHub OAuth. Each user gets a personal workspace on sign-up. Flows belong to workspaces, and every query checks membership. A flow you can't access returns 404, the same as one that doesn't exist.
- **Onboarding tour.** First-time visitors get a guided tour (`components/tour`). Each step spotlights the real UI while a scripted pointer demonstrates it on look-alike nodes drawn above the canvas, so the user's flow is never touched. The scripts run on the Web Animations API through a small `Stage` helper that stops a step's animation as soon as the user moves on. With reduced motion, the tour shows each step's end state instead.
- **Validation.** `validate()` checks for cycles, port type mismatches, unconnected required inputs and dangling edges. Diagram shapes are ignored, so annotations can share a canvas with a workflow.

## Develop

Requires Node 24, pnpm and PostgreSQL.

```bash
pnpm install
createdb flowcraft && createdb flowcraft_test && createdb flowcraft_collab_test
cp apps/web/.env.example apps/web/.env.local   # fill in DATABASE_URL, BETTER_AUTH_SECRET, COLLAB_SECRET
cp apps/collab/.env.example apps/collab/.env   # same DATABASE_URL, same COLLAB_SECRET
DATABASE_URL=<your url> pnpm db:migrate        # repeat for both test databases
pnpm dev          # web on http://localhost:3000, collab server on ws://localhost:1234
pnpm test         # unit + integration tests; needs the flowcraft_test and flowcraft_collab_test databases
pnpm typecheck
pnpm build
```

Without `RESEND_API_KEY`, magic links are printed to the dev server's terminal.
After changing `packages/db/src/schema.ts`, run `pnpm db:generate` to create a migration.

New to the codebase? Start with [LEARNING.md](LEARNING.md). For how the Diagram and Workflow features behave, see [docs/diagram-and-workflow.md](docs/diagram-and-workflow.md).

## Roadmap

1. ✅ Foundation: monorepo, typed registry, engine, Yjs-backed editor
2. ✅ Accounts & saved flows: Better Auth (magic link, Google, GitHub), Postgres + Drizzle, dashboard
3. ✅ Real-time collaboration: self-hosted Hocuspocus, live cursors, sharing, public links, version history
4. Diagram mode: more shapes, styling, ELK auto-layout, PNG/SVG/Mermaid export
5. Workflow execution: Inngest durable runs, streaming Claude LLM nodes, run history
6. AI: generate a flow from a prompt, templates, command palette
