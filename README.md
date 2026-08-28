# SDG 17 · Global Partnership Platform

A full-stack web platform for **UN Sustainable Development Goal 17 — Partnerships for the Goals**, built by the RIT StudAI Foundery team: Next.js frontend + API, Postgres persistence, Telegram bot auth, and a live WebSocket poll.

> Global challenges require global partnerships. Explore how collaboration in finance, technology, skills, trade and policy can accelerate sustainable development.

All monetary figures use **Indian Rupees** in the `en-IN` standard — `₹1,00,000`, `₹10 Crore`.

This repo previously shipped as a static offline SPA (still available in [`legacy-static/`](legacy-static/)) and has been rebuilt as the full-stack platform below.

---

## Architecture

```
├── src/                 Next.js app (frontend + REST API) — deploy to Vercel
│   ├── app/             pages + API route handlers
│   ├── components/      simulators, map, status bar, auth, poll, pledge wall
│   └── lib/              formulas, INR formatting, auth, DB client, OTP
├── db/
│   ├── schema.sql        Postgres schema (Supabase-ready, RLS enabled)
│   └── migrate.mjs        applies schema.sql against DATABASE_URL
├── server/               Telegram bot + WebSocket server — deploy separately
│   └── src/               (Vercel serverless can't hold a persistent
│                            connection open; this needs a long-running host —
│                            Railway, Render, Fly.io, or your own VM)
└── legacy-static/        the original offline single-page app
```

The web app and the real-time server are **two separate deployables** on purpose: Vercel's serverless functions can't keep a WebSocket or a Telegram long-polling connection alive, so the bot and the live-poll broadcaster run as their own always-on Node process.

---

## Setting up the accounts (do this once)

Nothing below is optional if you want the backend features live, but the frontend, all four simulators, and the status bar work today with **zero** of these configured — every API route degrades to a clear 503 instead of crashing when its dependency is missing.

### 1. Database — Neon (free tier, serverless Postgres)

The app talks to plain Postgres over the `pg` driver — nothing in the schema or the query layer is Supabase-specific, so any Postgres 14+ works. **Neon** is the recommended default: serverless (scales to zero between requests, so you don't pay/idle for a database that's mostly quiet), connection-pooled out of the box (its `-pooler` host batches connections instead of opening a fresh one per request — the thing that actually matters for "fast" under real traffic), and instant to provision.

1. Create a project at [console.neon.tech](https://console.neon.tech) (or, from this repo already linked to Vercel: **Vercel dashboard → Storage → Marketplace Database Providers → Neon** — one click, billed through the same Vercel account, no separate signup).
2. Copy the **pooled** connection string (the one with `-pooler` in the hostname) — it already includes `?sslmode=require`.
3. Put it in `.env.local` as `DATABASE_URL=...` and in `server/.env`.
4. Apply the schema:
   ```bash
   npm run db:migrate
   ```
   (Re-running this is safe — every statement in `db/schema.sql` is idempotent.)

Prefer Supabase instead? Its connection string works unchanged — paste it into the same `DATABASE_URL` and run the same migration. The schema detects which platform-specific roles exist (`service_role`, `anon`, `authenticated`) and only creates the matching RLS policies, so the same file applies cleanly either way.

### 2. Sessions — a JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Put the output in `.env.local` as `JWT_SECRET=...`.

### 3. Email OTP — Resend (free tier, 3,000 emails/month)

1. Create an account at [resend.com](https://resend.com), grab an API key.
2. `.env.local`: `RESEND_API_KEY=...`
3. Verify a sending domain in Resend and set `RESEND_FROM="SDG 17 Hub <noreply@your-verified-domain>"`. The default `onboarding@resend.dev` sender is for testing with the Resend account owner's address only; it cannot send verification codes to other users.
4. Set these variables in the hosting provider's production environment and redeploy. Without an API key, OTP codes print only in local development, never in production.

Unverified password logins send a fresh verification code. Delivery failures do not destroy the session; the verification page shows the failure and lets the user retry. Run `npm run test:auth` for regression tests using mocked database/email boundaries. Production delivery still needs a real inbox check and inspection of Resend's email logs.

The same key also powers: password reset emails, the support-request confirmation email, and a **login alert email** sent on every successful sign-in (password or OAuth) so an account owner notices a sign-in they didn't make. All three degrade the same way — logged to the server console instead of sent — if `RESEND_API_KEY` isn't set.

### 4. Telegram bot — @BotFather

1. Open Telegram, message **@BotFather**.
2. Send `/newbot`, follow the prompts, name it whatever you like.
3. You'll get a **token** (`123456789:AA...`) and a **username** (`YourBotName_bot`).
4. Token → `server/.env` as `TELEGRAM_BOT_TOKEN=...`
5. Username (no `@`) → `.env.local` as `TELEGRAM_BOT_USERNAME=...`

### 5. Internal shared secret (web ↔ bot/WS server)

Generate the same way as the JWT secret. Put the **identical** value in both `.env.local` and `server/.env` as `INTERNAL_SHARED_SECRET=...`.

### 6. Wire the two deployments together

Once both are deployed:
- `.env.local`: `WS_SERVER_INTERNAL_URL=https://your-realtime-server.example.com`
- `.env.local`: `NEXT_PUBLIC_WS_URL=wss://your-realtime-server.example.com/live`
- `server/.env`: `WEB_APP_URL=https://your-web-app.vercel.app`

### 7. Social sign-in — Google & Facebook (optional)

The routes and account-linking logic are fully built (`src/lib/oauth.ts`, `src/app/api/auth/oauth/**`) and wired into the login page — they just need a real OAuth app, which only a human can create (identity/domain verification):

1. **Google**: [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → **Create OAuth client ID** (type: Web application). Authorized redirect URI: `{NEXT_PUBLIC_APP_URL}/api/auth/oauth/google/callback`. Put the client ID/secret in `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
2. **Facebook**: [Meta for Developers](https://developers.facebook.com) → your app → Facebook Login → Settings → add the same callback URL under `/api/auth/oauth/facebook/callback`. Put the app ID/secret in `.env.local` as `FACEBOOK_CLIENT_ID` / `FACEBOOK_CLIENT_SECRET`.
3. Set `NEXT_PUBLIC_APP_URL` to your real deployed URL (redirect URIs must match exactly).

Until both env vars for a provider are set, `/api/auth/oauth/status` reports it as unavailable and its button on `/auth/login` stays disabled with an explanatory tooltip — never faked as working. Once configured, signing in finds an existing account by email and links the provider to it, or creates a new `general_user` account with the email marked verified (Google/Facebook already proved it).

### 8. Assistant LLM fallback — Groq (free, open-weight models)

The assistant works fully without this (rule-based intents + keyword knowledge base). This adds one more tier on top: an open-ended, grounded answer from an open-source model, for questions the rule-based layer doesn't recognise.

1. Create a free account at [console.groq.com](https://console.groq.com) — no credit card required — and grab an API key.
2. `.env.local`: `GROQ_API_KEY=...` (optionally `GROQ_MODEL=...`, defaults to `llama-3.3-70b-versatile`).
3. Groq runs open-source models (Llama 3.x, Gemma 2, etc.) on inference hardware built specifically for low latency — it's usually the fastest hosted option for this class of model.

This tier is read-only prose: the assistant never gives it tool-calling access, so every action it can actually perform (checking your profile/points/pledges, creating a reminder) still runs through the same permission-checked, audit-logged path as before — see `src/lib/assistant/llm.ts`.

### 9. SMS confirmations — Twilio (optional)

The support form's phone number field works today (it's stored either way); this is only what makes an SMS confirmation actually send.

1. Create an account at [twilio.com](https://twilio.com) (requires identity/payment verification — this step needs a human) and get a phone number.
2. `.env.local`: `TWILIO_ACCOUNT_SID=...`, `TWILIO_AUTH_TOKEN=...`, `TWILIO_FROM_NUMBER=...`.
3. Without all three set, a submitted phone number is still saved with the ticket, but no text is sent — the support page says so plainly rather than claiming a text went out.

### 10. Admin console access

There's no self-service way to become an admin — that's deliberate; privilege escalation should never be a UI button. After `npm run db:migrate`, promote an existing account directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your-username';
```

Then sign in and visit `/dashboard/admin` — support ticket triage (change status: received → in review → resolved → closed) and the assistant's admin-managed knowledge base (`assistant_faqs`, additive to the hardcoded answers in `src/lib/assistant/knowledge.ts`).

See `.env.example` and `server/.env.example` for the full annotated list.

---

## Running it locally

```bash
# Web app
npm install
npm run typecheck   # tsc --noEmit
npm run build
npm run dev          # http://localhost:3000

# Real-time server (separate terminal)
cd server
npm install
npm run dev           # http://localhost:8787/health
```

### Unit tests (no database needed)

The finance/trade/ecosystem formulas and the OTP logic are pure functions, tested independently of any live service:

```bash
npm run test:formulas
```

---

## What's in it

| Module | Where | Notes |
|---|---|---|
| **Finance impact simulator** | `src/components/simulators/FinanceSimulator.tsx` | Logarithmic ₹10 Lakh–₹50 Crore slider, exact spec formulas in `src/lib/formulas.ts` |
| **Fair trade simulator** | `TradeSimulator.tsx` | Three levers → growth / jobs / sustainability scores |
| **Capacity building** | `CapacitySimulator.tsx` | Role-based learning paths, printable certificate on completion |
| **Partnership builder** | `EcosystemBuilder.tsx` | Stakeholder + budget → scored partnership strength with diagnostic warnings |
| **Global partnership map** | `src/components/map/PartnershipMap.tsx` | Filterable SVG world map, five regional profiles |
| **Accessible status bar** | `src/components/statusbar/` | `role="progressbar"`, `aria-live`, Escape-to-cancel, expandable diagnostic log — drives every simulator's "Run" action |
| **Live audience poll** | `LivePoll.tsx` | WebSocket when `NEXT_PUBLIC_WS_URL` is set, REST polling fallback otherwise |
| **Pledge wall** | `PledgeWall.tsx` | Public, persisted via `/api/pledges` |
| **Auth** | `AuthPanel.tsx` + `/api/auth/*` | Username/password, email OTP verification, Telegram account linking, Google/Facebook OAuth (inert until credentials are set), login-alert email on every sign-in |
| **Admin console** | `src/app/dashboard/admin/` + `/api/admin/*` | Support ticket status triage, assistant knowledge-base (FAQ) management — role-gated server-side, no self-service admin signup |
| **Assistant LLM fallback** | `src/lib/assistant/llm.ts` | Open-weight model via Groq (free tier) for open-ended, grounded answers — read-only, no tool-calling access; inert until `GROQ_API_KEY` is set |
| **Support confirmations** | `/api/support` + `src/lib/mailer.ts` | Email always attempted when consented+provided; optional phone number field with SMS confirmation via Twilio once configured |

### The finance formulas (exact, from spec)

```
Projects Supported  = floor(Budget ÷ ₹4,00,000)
Communities Reached = Projects × 200
Impact Score        = min(99, 40 + floor(log₁₀(Budget) × 7.5))
```

Verified in `test/formulas.test.mjs` — e.g. ₹10 Crore → 250 projects, 50,000 communities, 99% impact.

### The Telegram auth flow

1. Signed-in user clicks **"Link Telegram"** → `POST /api/auth/telegram/start` issues a short-lived token and a `t.me/<bot>?start=<token>` deep link.
2. Opening that link sends `/start <token>` to the bot.
3. The bot asks the user to share their phone number via Telegram's **native** contact-request button — never typed.
4. The bot `POST`s `{ token, telegramId, phoneNumber }` to `/api/auth/telegram/callback`, authenticated with `INTERNAL_SHARED_SECRET`, which links the account and marks the phone verified.

---

## Deployment

**Web app → Vercel.** Standard Next.js deploy; set the `.env.local` variables above as Vercel project environment variables.

**Real-time server → any always-on host** (Railway, Render, Fly.io, a small VM). It needs:
- `server/.env` variables set
- Port exposed for both the HTTP health check and the WebSocket upgrade (same port, `/live` path)
- The bot uses long polling, so no inbound webhook configuration is required

### Railway deployment (recommended)

The repository includes `server/Dockerfile` and `server/railway.json` for a
repeatable Railway deployment. Create a Railway service from this GitHub
repository, set its **root directory** to `server`, and set these variables in
Railway (never commit them):

```text
DATABASE_URL
TELEGRAM_BOT_TOKEN
WEB_APP_URL=https://sdg17-studaifoundery.vercel.app
INTERNAL_SHARED_SECRET
```

Railway supplies `PORT` automatically. Once it produces a public HTTPS URL,
set the following Vercel Production variables and redeploy the web app:

```text
WS_SERVER_INTERNAL_URL=https://<railway-service-url>
NEXT_PUBLIC_WS_URL=wss://<railway-service-url>/live
```

The real-time service continuously probes Postgres every 30 seconds. `GET
/health` is a liveness endpoint with the latest dependency state, while `GET
/ready` returns `503` until the configured database answers a probe. After a
database failure, the checker discards its stale pool and retries with a fresh
connection on the next pass; it never modifies data, credentials, or schema.

---

## Accessibility

- Status bar: `role="progressbar"`, live `aria-valuenow`, `aria-live="polite"` announcements, Escape cancels any running operation, expandable step + log drawer
- Every interactive control is keyboard-reachable with a visible focus ring
- `prefers-reduced-motion` disables all animation
- Chart/map identity never depends on colour alone — legends and direct labels accompany every encoding

---

## Data

All datasets (regions, pillars, seed pledges) are **illustrative**, embedded in `src/lib/mapData.ts`. This is a teaching and advocacy tool, not an official UN data source.

---

## Contributing

```bash
git clone https://github.com/andringodson/SDG17-StudAIFoundery.git
cd SDG17-StudAIFoundery
npm install
git checkout -b your-feature
# edit, then
git commit -am "describe the change"
git push origin your-feature
```

**Team:** [@andringodson](https://github.com/andringodson) · [@karthikeyan0929](https://github.com/karthikeyan0929) · [@ssudharsanan2007-max](https://github.com/ssudharsanan2007-max)
