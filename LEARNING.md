# Learning guide

A map of this codebase for learning from it: which files are worth studying and in what order, which ones you can skip, what each technology choice taught, and what could have been done differently.

The best way to use it: read a file, run its tests (`pnpm test`), then change something and watch a test fail.

---

## 1. Read these, in this order

Each step builds on the one before it. Together they're about 15% of the code but cover nearly all the ideas.

| # | File(s) | What you'll learn | Why it matters |
|---|---------|-------------------|----------------|
| 1 | `packages/flow-engine/src/topo.ts`, `validate.ts` | Graphs, topological sort (Kahn's algorithm), cycle detection | Every workflow tool (Airflow, n8n, GitHub Actions) runs on a DAG. You can explain "how do you know what runs first?" |
| 2 | `packages/flow-engine/src/interpolate.ts` | Regex with global flags, `matchAll`, template variables | One small function powers both the dynamic ports in the UI and (later) execution on the server. One source of truth. |
| 3 | `packages/node-registry/src/define.ts`, `nodes/workflow.ts` | Zod schemas as the single description of a node; schema introspection to generate forms | **Config-driven architecture**: add one file, and the canvas, inspector, validation and connection rules all pick it up. This is the "unlimited ways to make things" layer. |
| 4 | `apps/web/lib/flow-doc.ts` | CRDTs (Yjs), shared vs. local state, transaction origins, `Y.UndoManager` | The heart of the app. Read `projectNodes` closely: it keeps shared data (positions) separate from per-user data (selection), and that's what makes multiplayer work. |
| 5 | `apps/web/lib/connections.ts` | Turning domain rules into a pure function | Shows how to keep business logic out of components so it can be tested. |
| 6 | `apps/web/components/editor/WorkflowNode.tsx` | React Flow custom nodes, `memo`, `useUpdateNodeInternals` | How the original `NodeUniversal.js` grew up: same ideas, typed and split into small pieces. |
| 7 | `packages/db/src/schema.ts`, `flow-doc.ts` | Relational modelling, enums, composite keys, `SELECT … FOR UPDATE` row locks | `applyFlowUpdate` is a classic **read–modify–write under a lock**. The `snapshot` column is deliberate denormalisation (see §5). |
| 8 | `apps/web/server/flows.ts` | Access control with SQL joins; roles as a ranking; "404, not 403" | `findFlowForUser` merges two sources of access (workspace membership and email shares) into one role. |
| 9 | `apps/web/server/trpc/` (`init.ts`, `access.ts`, `routers/*`) | End-to-end type safety, middleware (`protectedProcedure`), **dependency injection** (the `Mailer` in context) | The mailer is injected, so tests capture emails instead of sending them. Look at how `share.invite` is tested. |
| 10 | `apps/web/lib/auth.ts`, `proxy.ts` | Sessions, magic links, OAuth, database hooks | `proxy.ts` only checks that a cookie *exists* (fast, optimistic); pages and APIs check that the session is *valid*. Know why you need both. |
| 11 | `apps/collab/src/token.ts`, `server.ts` | WebSockets, JWTs (signing and verifying), debounced persistence | **Stateless auth between services**: the web app vouches for the user and the collab server only checks the signature. The collab server never reads a session. |
| 11b | `apps/collab/src/activity.ts` | Reading *who* changed *what* from a Yjs transaction (`changedParentTypes`, transaction origins); stateless messages for chat; an internal webhook between services | Attribution happens on the server from the authenticated connection. That's why it can be trusted: a client can't claim someone else made an edit. |
| 12 | `apps/web/lib/presence.ts`, `use-collab.ts` | Awareness (ephemeral presence), `useSyncExternalStore`, cached snapshots | How to connect a non-React event source to React without re-rendering the whole tree on every mouse move. |
| 13 | `apps/web/components/tour/stage.ts` | Web Animations API, `AbortController` for cancellation | Shows that one `AbortSignal` can cleanly stop timers, animations and async loops. |
| 14 | `apps/web/server/flows.test.ts`, `apps/collab/src/server.test.ts` | Integration tests against a real Postgres and a real WebSocket server | These tests prove things like "a viewer's edits are rejected" and "two concurrent saves both survive". Read the test names first; they work as a spec. |

Also worth a look, in one function: the `remove` mutation in `apps/web/app/(app)/dashboard/Dashboard.tsx` shows **optimistic updates with rollback** (`onMutate` → `onError`).

---

## 2. Skim or skip (and why)

| File(s) | Why you can skip it |
|---------|---------------------|
| `Palette.tsx`, `Inspector.tsx`, `TopBar.tsx`, `FlowCard.tsx`, `ShareDialog.tsx`, `VersionHistory.tsx`, sign-in and landing pages | Mostly markup and Tailwind classes. Once you've seen one component's pattern, the others repeat it. Read them only for the specific behaviour you're debugging. |
| `components/tour/editor-tour.ts`, `mocks.ts` | Animation choreography. Once you understand `Stage` (#13 above), these are just a sequence of `moveTo` / `click` / `type` calls. |
| `components/tour/placement.ts` | Simple rectangle geometry; its test file explains it better than reading the code. |
| `lib/icons.ts`, `cn.ts`, `time.ts`, `base64.ts` | Tiny utilities. |
| `packages/db/migrations/*.sql` | Generated by `drizzle-kit`. Read one once to see what SQL your schema becomes, but never edit them by hand. |
| `pnpm-lock.yaml`, `next-env.d.ts`, `AGENTS.md`, `.next/`, `.turbo/` | Generated by tools. |
| `components/ui/Dialog.tsx` | Worth 2 minutes to see how little code the native `<dialog>` needs, then move on. |

---

## 3. What you'll be able to explain

### Frontend
- **Controlled React Flow with an external store.** The graph lives in Yjs; React state is a *projection* of it, plus local-only UI state (`flow-doc.ts`).
- **Avoiding re-renders.** The context is split into stable *actions* and changing *state* (`flow-context.tsx`), nodes are `memo`'d, and presence uses per-node cached selectors.
- **Schema-driven UI.** Forms are generated from Zod schemas (`describeFields`).
- **Accessibility basics.** Native `<dialog>`, `aria-live` status, keyboard navigation in the tour, and `prefers-reduced-motion`.

### Real-time
- **CRDT vs. last-write-wins.** Why two people can edit at once without a server deciding who wins.
- **Document state vs. awareness.** Nodes are saved forever; cursors are ephemeral and never stored.
- **Transaction origins.** Why Ctrl+Z only undoes *your* edits (`trackedOrigins: LOCAL_ORIGIN`).
- **Offline tolerance.** Edits pile up in the local doc and sync when the socket reconnects.
- **Debouncing in layers** (`use-collab.ts`, `apps/collab/src/server.ts`). Batching on the network (`flushDelay`, a fixed window, so latency is capped), debouncing database writes (`debounce` / `maxDebounce`), and debouncing the *status indicator* so the UI stays calm. Know the difference between a debounce, which resets on every event, and a batch window, which doesn't.
- **Audit trail plus chat in one append-only table** (`flow_event`), with a typed payload per event kind. The actor's name is copied into each row so history survives renames and deleted accounts.

### Backend
- **Auth flows.** Magic link (token emailed, verified, session cookie set) and OAuth.
- **Authorisation.** Roles, ranking, effective role = max(membership, share), and 404 instead of 403 so flow ids can't be probed.
- **Service-to-service auth with JWTs.** Short expiry, audience and issuer checks.
- **Concurrency.** Row locks plus commutative merges mean no lost updates.

### Data
- **Modelling.** Workspaces, members, flows, shares (keyed by email so invites work before sign-up), versions.
- **Binary data in Postgres** (`bytea` for Yjs state) next to JSON (`jsonb` snapshots).
- **Migrations as code** (Drizzle).

### Engineering practice
- **Monorepo boundaries.** Pure packages (`flow-engine`, `node-registry`) have no React and no database, so they're trivially testable.
- **Integration tests over mocks** where the risk is in the integration (SQL, WebSockets).
- **CI with a real Postgres service container.**
- **Production hardening** (the v1 release):
  - env validation that refuses localhost defaults in production (`apps/web/lib/env.ts`)
  - a health endpoint plus a wake-up ping for sleeping free hosts (`WakeCollab.tsx`)
  - transaction-pooler detection (`packages/db/src/connect.ts`)
  - security headers (`next.config.ts`)
  - loading Yjs once on the server (`serverExternalPackages`), because two copies break its constructor checks

---

## 4. Tech choices and the alternatives

For each layer: what we used, what else you could use, and when the alternative is the better choice.

| Layer | Used here | Alternatives | Pick the alternative when… |
|-------|-----------|--------------|----------------------------|
| Monorepo | **Turborepo + pnpm** | Nx, plain npm/pnpm workspaces, separate repos | **Nx:** you want code generators and strict module boundaries at large scale. **Plain workspaces:** 2–3 packages and no need for build caching. |
| Framework | **Next.js 16 (App Router)** | React Router 7 (Remix), TanStack Start, Vite SPA + separate API, SvelteKit | **Vite SPA:** no SEO needs and you want the simplest mental model. **TanStack Start:** you want type-safe routing everywhere and less "magic". |
| Canvas | **React Flow (@xyflow/react)** | tldraw, Excalidraw (embed), Konva / PixiJS, raw `<canvas>` | **tldraw:** you want a freeform whiteboard. **PixiJS:** thousands of nodes, where WebGL beats the DOM. React Flow is best for *node graphs* made of HTML nodes. |
| Real-time sync | **Yjs + self-hosted Hocuspocus** | Liveblocks, Automerge, PartyKit / Cloudflare Durable Objects, Replicache / Zero, Supabase Realtime, ElectricSQL | **Liveblocks:** you don't want to run a server. **Automerge:** you want JSON-like documents and a Rust core. **Supabase Realtime:** simple broadcasts where last-write-wins is fine (it isn't a CRDT). **Zero / Replicache:** you want server-authoritative sync over relational data. |
| API | **tRPC** | REST + OpenAPI (e.g. Hono + zod-openapi), GraphQL, Next.js server actions | **REST/OpenAPI:** non-TypeScript clients (mobile, partners) need your API. **GraphQL:** many clients with very different data needs. **Server actions:** small forms with no reusable API. |
| Auth | **Better Auth** | Auth.js, Clerk, WorkOS, Supabase Auth, roll your own | **Clerk / WorkOS:** you want hosted UI, SSO and SAML without building them. **Roll your own:** only to learn. Never for production. |
| Database / ORM | **Postgres + Drizzle** | Prisma, Kysely, raw SQL (`postgres.js`); MongoDB; SQLite / Turso | **Prisma:** you prefer a schema DSL and a generated client. **Kysely:** you want a pure query builder. **SQLite / Turso:** edge-hosted, read-heavy apps. **MongoDB:** truly schemaless data (not this app, which is relational). |
| Validation | **Zod 4** | Valibot, ArkType, TypeBox | **Valibot:** bundle size matters a lot (it's tree-shakable). **TypeBox:** you need JSON Schema output. |
| Styling | **Tailwind CSS 4** | CSS Modules, vanilla-extract, Panda CSS, shadcn/ui on top of Tailwind | **CSS Modules:** a team that prefers plain CSS. **shadcn/ui:** you want ready-made accessible components (planned for later phases). |
| Animation | **Web Animations API** (built in) | Motion (Framer Motion), GSAP | **Motion:** layout animations and React-driven gestures. **GSAP:** complex timelines and scroll-driven storytelling. |
| Testing | **Vitest** with real Postgres and WebSockets | Jest, Testcontainers, Playwright (end-to-end) | **Testcontainers:** you want each test run to start its own throwaway database. **Playwright:** testing the full browser flow (planned). |
| Email | **Resend** (console fallback in dev) | Postmark, Amazon SES, Nodemailer + SMTP | **SES:** high volume and low cost. **Postmark:** the best deliverability for transactional email. |
| Hosting (planned) | **Vercel (web) + Fly.io or Railway (collab) + Neon (Postgres)** | One VPS with Docker Compose, Cloudflare (Workers + Durable Objects), AWS (ECS / RDS) | **VPS:** cheapest, with full control. **Cloudflare:** run everything at the edge, with Durable Objects as the room server. |

### Choices made along the way (worth discussing in interviews)
- **Hocuspocus instead of Liveblocks.** More code to own, but it works offline, needs no vendor account, and shows backend skills. Trade-off: WebSockets can't run on Vercel, so the collab server needs its own host.
- **JWT handoff between services instead of a shared session lookup.** The services stay decoupled. Trade-off: a revoked share keeps working until the token expires or the user reconnects (see §5).
- **Native `<dialog>` instead of a component library.** The browser now handles focus trapping and Esc, so there's less JavaScript.
- **Web Animations API instead of an animation library.** No extra dependency, and animations can be cancelled directly.

---

## 5. Known limitations (the honest list)

Knowing these, and how you'd fix them, is as valuable as the features.

1. **Each node is one CRDT value.** Two people editing *different fields of the same node* at the same moment: the last write wins for that node. **Fix:** store each node as a nested `Y.Map`, and long text as `Y.Text` (which also gives character-level merging).
2. **Revoking access doesn't disconnect live sessions.** Someone removed from a flow keeps their open WebSocket until it reconnects (tokens last 1 hour). **Fix:** when a share is removed, call the collab server (an internal HTTP endpoint) to run `closeConnections(flowId)`, or keep tokens short and re-check on `onTokenSync`.
3. **The collab server is one instance.** It's fine for a portfolio. **Fix for scale:** `@hocuspocus/extension-redis` so several instances share rooms.
4. **The snapshot column is denormalised.** It must be kept in sync with `doc`. That's safe here because one function (`applyFlowUpdate`) writes both. If you ever write `doc` anywhere else, you'll get stale previews.
5. **Activity only logs adds and deletes.** Moving a node or editing its fields isn't logged; it would flood the timeline. A next step would be coalescing edits per user and node ("Ada edited the LLM prompt").
6. **The auto-version timer lives in memory**, so it re-reads the latest version from the database after a restart. That's correct but slightly chatty.
7. **Not yet built:** rate limiting, ESLint, Playwright end-to-end tests, error monitoring (Sentry), and running workflows (Phase 5).

---

## 6. Exercises (learn by changing things)

Ordered from easiest to hardest. Each one touches a different layer.

1. **Add a node type.** Create a "Delay" workflow node in `packages/node-registry/src/nodes/workflow.ts` with a `seconds` number field. Notice that the palette, inspector and validation all work without any other change.
2. **Add a validation rule.** Warn when an output port isn't connected to anything. Add the code in `flow-engine/validate.ts` and a test in `engine.test.ts`.
3. **Fix limitation #2.** Add a small authenticated HTTP endpoint to the collab server that closes connections for a flow, and call it from `share.remove`. Write a test in `apps/collab/src/server.test.ts`.
4. **Per-field CRDT (limitation #1).** Change `flow-doc.ts` to store nodes as nested `Y.Map`s. The existing tests should keep passing. Add one that edits two fields of the same node from two documents.
5. **Playwright end-to-end test.** Sign in with a magic link (read the link from the server log or a test mailbox), create a flow, reload, and assert that it persisted.
6. **Rate limiting.** Limit `share.invite` to 20 per hour per user. Try it in-memory first, then with Upstash Redis.

---

## 7. Interview questions this project prepares you for

- How does your app handle two people editing the same thing at once? *(CRDTs, Yjs, why there are no locks on the client.)*
- How do you prevent lost updates on the server? *(Row lock + commutative merge in `applyFlowUpdate`.)*
- How do your web app and WebSocket server trust each other? *(Signed JWT with audience, issuer and expiry; the shared secret.)*
- Why return 404 instead of 403 for flows you can't access?
- What's the difference between `proxy.ts` auth and the session check in the page?
- How do you keep a big React canvas fast? *(memo, split contexts, cached external-store snapshots, rAF-throttled cursor updates.)*
- Walk me through what happens from typing `{{topic}}` to a new port appearing. *(`extractVariables` → registry `ports()` → `WorkflowNode` → `useUpdateNodeInternals`.)*
- How would you scale the real-time server? *(Redis extension, sticky sessions, rooms per flow.)*
- What would you change if you started again? *(Pick something from §5 and explain the trade-off.)*
