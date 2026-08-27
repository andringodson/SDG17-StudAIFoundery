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

### 1. Database — Supabase (free tier)

1. Create a project at [supabase.com](https://supabase.com).
2. Project Settings → Database → Connection string → **URI** (Session mode). Copy it.
3. Put it in `.env.local` as `DATABASE_URL=...` (append `?sslmode=require` if not already present) and in `server/.env`.
4. Apply the schema:
   ```bash
   npm run db:migrate
   ```
   (Re-running this is safe — every statement in `db/schema.sql` is idempotent.)

### 2. Sessions — a JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Put the output in `.env.local` as `JWT_SECRET=...`.

### 3. Email OTP — Resend (free tier, 3,000 emails/month)

1. Create an account at [resend.com](https://resend.com), grab an API key.
2. `.env.local`: `RESEND_API_KEY=...`
3. Without this, OTP codes print to the server console instead of emailing — useful for local dev.

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
| **Auth** | `AuthPanel.tsx` + `/api/auth/*` | Username/password, email OTP verification, Telegram account linking |

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
