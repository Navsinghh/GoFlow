# Deploying Flowcraft v1

## In plain words
Flowcraft has three parts. Each lives in a different place:

| Part | What it does | Where it goes |
|---|---|---|
| **Website** (`apps/web`) | pages, sign-in, dashboard, API | **Vercel** (free Hobby plan) |
| **Database** | users, flows, history, chat | **Neon** (free Postgres) |
| **Collaboration server** (`apps/collab`) | keeps a live connection to everyone editing, syncs edits and chat, **saves flows** | a host that keeps a program **running all the time**: you choose (see below) |

Vercel runs code for a few seconds per request and then stops, so it can't hold the live connection the collaboration server needs. That's why it gets its own host.

You'll do these steps once, in this order, which takes roughly 45–60 minutes:
1. Database (Neon)
2. Collaboration server
3. Website (Vercel)
4. GitHub and Google sign-in
5. Smoke test

You'll need two random secrets. Create each with:

```bash
openssl rand -base64 32
```

Keep them somewhere safe (a password manager):
- **AUTH secret:** used only by the website.
- **COLLAB secret:** must be **identical** on the website and the collaboration server.

---

## 1. Database: Neon
Neon gives you two connection strings for the same database:
- **Pooled** (the host name contains `-pooler`): many short visits share a few real connections. The **website** uses it, because every Vercel function opens its own.
- **Direct**: one real connection each. **Migrations** and the **collaboration server** use it, because they run long transactions and lock rows while saving.

This repository is already linked to a Neon project (`neon.ts`, plus the gitignored `.neon` file). From the repository root:

```bash
npm i -g neon@latest   # once
neon login             # once; opens the browser
neon env pull          # writes DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED (direct) to .env.local
pnpm db:migrate:neon   # creates or updates the tables, over the direct connection
```

Without the CLI, copy both strings from the project's **Connect** dialog in the Neon console (the **Connection pooling** switch picks between them), then run the migrations with the direct one:

```bash
DATABASE_URL="postgresql://…direct…/neondb?sslmode=require&channel_binding=require" pnpm db:migrate
```

Run the migrations again whenever a new release includes database changes (new files in `packages/db/migrations`).

The app talks to Postgres through node-postgres (`pg`). It works through Neon's pooler as-is and verifies the database's TLS certificate. On Vercel it also closes idle connections before a function is suspended (`attachDatabasePool` in `apps/web/lib/db.ts`).

## 2. Collaboration server: choose a host
### What it needs
- Node.js 24 **or** Docker. A Dockerfile is included: `apps/collab/Dockerfile`, built from the repository root.
- **WebSocket support** (`wss://`).
- About 256–512 MB of RAM; very little CPU.
- Environment variables:
  - `DATABASE_URL_UNPOOLED`: the Neon **direct** string (naming it `DATABASE_URL` works too)
  - `COLLAB_SECRET`: the COLLAB secret
  - `PORT`: usually set by the host automatically
- Health check path: **`/health`**, which returns `{"ok":true}`.

### Options (terms change often; check each pricing page)
| Host | Cost | Card | Sleeps when idle? | What it means for visitors |
|---|---|---|---|---|
| **Render** (free web service) | Free | No | Yes, after ~15 min; ~1 min to wake | First visitor after a quiet spell sees "Connecting…" for about a minute |
| **Northflank** (free sandbox) | Free | Possibly, for verification | Reported as always on | No waiting, if the terms still hold |
| **Google Cloud Run** | Free monthly allowance, then usage-based | Yes | Scales to zero, wakes in seconds | Fast wake. Connections are capped at 60 min; Flowcraft reconnects automatically |
| **Koyeb** | Free tier | Yes (2026) | After ~1 h idle | Like Render |
| **Railway** | Trial, then ~$5/month | Yes | No | Simple, not free long-term |
| **Fly.io** | No free tier | Yes | No | Good, paid |
| **Small VPS** (Hetzner, DigitalOcean, Oracle Always Free) | ~$4–6/month (Oracle free) | Yes | No | Always fast; you maintain the server |

**Keep an eye on: Vercel WebSockets.** Vercel Functions now accept WebSocket connections (public beta, `@vercel/functions` 3.10 and later). That could one day put the collaboration server on Vercel too, but not as it stands: each function instance holds its own connections, so rooms would need syncing across instances (for example through Redis), and connections have a maximum duration. Flowcraft doesn't support this yet.

### Questions to answer while researching
1. WebSockets supported?
2. Does the free plan sleep, and how long does waking take?
3. Card required?
4. Monthly limits (hours, bandwidth, connection length)?
5. A region near your Neon database?
6. Deploys from GitHub, or from a Dockerfile?

### While the server is asleep or down
- Flows still open and show their saved content.
- The status shows "Connecting…".
- Edits stay in the browser and sync once it's back; they're only lost if the tab is closed first.
- The landing page and dashboard send a **wake-up ping**, so the server is usually awake by the time someone opens a flow.

### Deploying it
- **Docker-based hosts** (Render, Northflank, Cloud Run, Koyeb, a VPS):
  - Dockerfile: `apps/collab/Dockerfile`
  - Build context: the **repository root**
- **Native Node hosts** (e.g. Render "Node" runtime):
  - Build command: `corepack enable && pnpm install --frozen-lockfile --filter "@flowcraft/collab..."`
  - Start command: `cd apps/collab && NODE_ENV=production node --import tsx src/main.ts`

#### Google Cloud Run, step by step
Google builds the container from GitHub and redeploys it on every push to `main`.
1. **Cloud Run → Deploy container → Continuously deploy from a repository → Set up with Cloud Build.**
   - Connect GitHub and install the Google Cloud Build app for this repository only.
   - Branch `^main$`, build type **Dockerfile**, source location `/apps/collab/Dockerfile`.
2. **Service name** `flowcraft-collab`. **Region:** the one closest to your Neon database (e.g. `asia-southeast1` for Neon's Singapore region).
3. **Authentication:** allow public access. Browsers connect directly, and the server checks Flowcraft's own tokens.
4. **Billing:** request-based. **Scaling:** minimum 0, maximum **1** instance.
5. **Container settings:** port 8080, 512 MiB memory, 1 CPU, request timeout **3600** seconds, maximum concurrent requests **1000**.
6. **Variables:** `DATABASE_URL_UNPOOLED` (the Neon direct string) and `COLLAB_SECRET`.
7. **Networking:** session affinity on, HTTP/2 end-to-end off.

| Setting | Why |
|---|---|
| Maximum 1 instance | Each instance holds its own live copy of a flow; two instances would split the people editing it |
| Timeout 3600 s | WebSocket connections count as requests. The default 5 minutes would cut every connection; 60 minutes is the maximum, and the editor reconnects by itself |
| 1000 concurrent requests | Every open connection takes one slot (the default is 80) |
| Minimum 0 instances | Nothing to pay while nobody is connected; it starts in a few seconds, and the wake-up ping hides most of that |

Cloud Run bills while any WebSocket is open. That's why the editor pauses its connection when a tab sits in the background for 5 minutes or goes 30 minutes without input, and rejoins as soon as the person is back. Set a budget alert under **Billing → Budgets & alerts** anyway.

After it's live, open `https://<your-collab-host>/health` and confirm you see `{"ok":true}`. Note the address. You'll use it twice:
- `wss://<your-collab-host>` for browsers
- `https://<your-collab-host>` for the website's server

## 3. Website: Vercel
1. At [vercel.com](https://vercel.com), choose **Add New → Project** and import the GitHub repository **Navsinghh/GoFlow**.
2. Settings:
   - **Root Directory:** `apps/web`
   - **Framework preset:** Next.js
   - **Node.js version** (Project Settings → General): 24.x
   - **Function region** (Project Settings → Functions): the one closest to your Neon database, e.g. **Singapore (sin1)** for Neon's Singapore region. Most pages query the database, so a region on another continent makes every page noticeably slower.
3. Environment variables (Project Settings → Environment Variables):

| Name | Value |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (the `DATABASE_URL` line that `neon env pull` writes) |
| `BETTER_AUTH_SECRET` | the AUTH secret |
| `BETTER_AUTH_URL` | your site URL, e.g. `https://flowcraft-xyz.vercel.app` (no trailing slash) |
| `COLLAB_SECRET` | the COLLAB secret (same as on the collaboration server) |
| `NEXT_PUBLIC_COLLAB_URL` | `wss://<your-collab-host>` |
| `COLLAB_INTERNAL_URL` | `https://<your-collab-host>` |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` (makes Vercel use the exact pnpm version in `package.json`) |

4. Deploy.
   - The first deploy gives you the site URL. If it differs from what you put in `BETTER_AUTH_URL`, update that variable and redeploy.
   - Later, every `git push` to `main` redeploys automatically.

`NEXT_PUBLIC_…` values are baked in at build time, so **redeploy after changing them**.

## 4. Sign-in: GitHub and Google
Email sign-in links are hidden in production unless an email service with your own domain is configured. GitHub and Google sign-in are free and need no domain.

### GitHub (about 2 minutes)
1. Go to GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Homepage URL:** `https://<your-site>`
   - **Authorization callback URL:** `https://<your-site>/api/auth/callback/github`
3. Create the app, then generate a **client secret**.
4. In Vercel, add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`, then redeploy.

### Google (about 10 minutes)
1. In [Google Cloud Console](https://console.cloud.google.com), create a project. Then go to **APIs & Services → OAuth consent screen**.
   - Choose **External**.
   - Fill in the app name and your email.
   - Use the basic scopes (email, profile, openid). These don't need Google's review.
   - **Publish** the app, so anyone (not just test users) can sign in.
2. Go to **Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origin:** `https://<your-site>`
   - **Authorized redirect URI:** `https://<your-site>/api/auth/callback/google`
3. In Vercel, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then redeploy.

The sign-in page shows a button for each provider that has both values set.

## 5. Smoke test
- [ ] The landing page shows the **v1** badge and the "Coming in v2" section.
- [ ] **Try it without signing up** opens the playground.
- [ ] Sign in with GitHub, then Google. The dashboard shows the v2 banner.
- [ ] Create a flow, add nodes, and reload: everything is still there, and the top bar says **Saved**.
- [ ] Open the same flow in a private window, signed in as someone else and invited via **Share**: you see each other's cursors and chat.
- [ ] **Share → Public link** opens a view-only live page without signing in.
- [ ] `https://<your-collab-host>/health` returns `{"ok":true}`.

## Troubleshooting
| Symptom | Likely cause |
|---|---|
| "Connecting…" never ends | The collab host is asleep or down; `NEXT_PUBLIC_COLLAB_URL` is wrong (must be `wss://`); or `COLLAB_SECRET` differs between the two services |
| "No access" in the editor | `COLLAB_SECRET` mismatch |
| GitHub/Google error "redirect_uri mismatch" | The callback URL doesn't exactly match `https://<your-site>/api/auth/callback/<provider>` |
| Sign-in page says it isn't set up | No OAuth variables set (or no redeploy after adding them) |
| Vercel build fails installing packages | Add `ENABLE_EXPERIMENTAL_COREPACK=1` |
| `pnpm db:migrate:neon` says "DATABASE_URL is not set" | The repository root has no `.env.local` yet: run `neon env pull` |
| Build fails with "COLLAB_INTERNAL_URL" or "NEXT_PUBLIC_COLLAB_URL" required | Production builds require both; set them in Vercel |
| Build says a variable is missing even though it's set in Vercel | Turborepo only passes variables listed in `turbo.json`; add new ones there (`env` if they change the build output, otherwise `passThroughEnv`) |
| Chat or activity doesn't update live for web-side actions (renames, shares) | `COLLAB_INTERNAL_URL` is wrong or blocked |
