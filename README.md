# SupportFlow — AI-Assisted Customer Support Desk (MERN Stack)

SupportFlow is an AI-assisted customer support platform: **customers** submit tickets, **Gemini AI** triages category, priority and sentiment within seconds, **agents** review and take over, and issues get resolved — all in **real time**.

Built end-to-end on the **MERN** stack:

| Layer | Technology |
|---|---|
| **M** — Database | MongoDB Atlas (Mongoose ODM) |
| **E** — Backend framework | Express.js |
| **R** — Frontend | React 19 (Vite, TypeScript) |
| **N** — Runtime | Node.js |

Plus: **Socket.IO** realtime, **JWT + bcrypt** authentication, **Gemini AI** (triage, resolution drafts, chatbot), **Three.js + GSAP + Anime.js + Lenis** animations, Poppins-only typography, light/dark themes, zero gradients.

---

## 1. Quick Start

```bash
# 1) Install everything (root + server + client)
npm run install-all

# 2) Start API (3001) + realtime (3002) + React dev server (5173) together
npm run dev
```

Then open **http://localhost:5173**.

> The server **auto-seeds demo data on first boot** (users + 5 tickets across the workflow), so the demo is instantly explorable.

### Manual setup (alternative)

```bash
# Terminal 1 — API + realtime
cd server
npm install
npm run dev          # http://localhost:3001 (REST) + :3002 (Socket.IO)

# Terminal 2 — React client
cd client
npm install
npm run dev          # http://localhost:5173
```

---

## 2. Demo Accounts (auto-seeded)

| Role | Email | Password |
|---|---|---|
| Customer | `customer@supportflow.io` | `Demo@123` |
| Support Agent | `agent@supportflow.io` | `Agent@123` |
| Second Agent | `maya@supportflow.io` | `Agent@123` |
| Administrator | `admin@supportflow.io` | `Admin@123` |

---

## 3. Environment Variables

### `server/.env` (pre-configured — already contains your keys)

```ini
PORT=3001
SOCKET_PORT=3002

JWT_SECRET=supportflow-hackathon-jwt-secret-change-me-in-production
JWT_EXPIRES_IN=7d

# Gemini AI (server-side only — the key never reaches the browser)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODELS=gemini-3.6-flash,gemini-flash-latest,gemini-2.0-flash
GEMINI_TIMEOUT_MS=15000

# MongoDB Atlas
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/supportflow?retryWrites=true&w=majority
MONGODB_DB_NAME=supportflow

AUTO_ASSIGN=false          # bonus: auto-assign to least-busy matching agent
AI_CHAT_RATE_LIMIT=20      # chatbot requests per minute per IP
```

### `client/.env`

```ini
VITE_API_URL=http://localhost:3001      # Express REST API
VITE_SOCKET_URL=http://localhost:3002   # Socket.IO realtime
```

---

## 4. MongoDB Atlas Setup (one-time)

The `server/.env` ships with the Atlas URI pre-filled. To make it connect:

1. Open **https://cloud.mongodb.com** → your cluster **Cluster0**
2. **Network Access** → **+ ADD IP ADDRESS** → `0.0.0.0/0` (allow from anywhere — fine for a hackathon demo) → Confirm
3. **Database Access** → make sure the user `socialmarketing225_db_user` exists with read/write (`Atlas admin` or `readWriteAnyDatabase`)
4. Restart `npm run dev`

The health endpoint shows which mode is active:

```bash
curl http://localhost:3001/api/health
# { "database": "atlas" }        ← Atlas connected
# { "database": "embedded ..." } ← fallback (see below)
```

**Fallback:** if Atlas is unreachable (no network, IP not whitelisted yet), the server automatically boots an embedded local MongoDB so the demo **never breaks** — useful for offline presentations.

---

## 5. What's Implemented

### Core workflow (per hackathon spec)
- **Customer**: register/login → create ticket → watch AI triage appear live → chat with support → reopen if needed
- **AI triage (Gemini)**: every new ticket is classified into **category** (Billing / Technical / Account / Shipping / Product / General), **priority** (Low / Medium / High) and a **neutral summary + sentiment** — stored on the ticket, pending human approval
- **Agent**: review queue → approve/edit/reject AI suggestions → take ticket → message customer (realtime, with typing indicators) → resolve with a resolution note (AI can draft it) → resolved tickets are locked
- **Admin**: overview dashboard, live stats from real data (resolution rate, SLA times, category mix), agent workload

### Profile settings (every role)
- **Profile picture** — upload/remove right from the browser; the image is square-cropped, downscaled to 256×256 and stored in **localStorage**, so it persists on every visit without any upload server. It appears in the app header, profile page and ticket conversations.
- **Personal details** — edit **name, phone number, company, location and bio** (saved to MongoDB via `PATCH /api/auth/profile`); email and role are shown read-only.
- **Change password** — requires the current password (`PATCH /api/auth/password`); new password must be 8+ characters, bcrypt-hashed before storage.
- Reachable from the header avatar / user chip or the **Settings** nav item (`#/settings`).

### AI features (Gemini API)
| Feature | Endpoint | Behavior |
|---|---|---|
| Ticket triage | automatic on ticket create | JSON-validated output; falls back through GLM → deterministic rules so the workflow never blocks |
| Resolution draft | `POST /api/tickets/:id/resolution-draft` | agent asks AI to draft the resolution note |
| AI chatbot ("Flow") | `POST /api/ai/chat` | floating assistant on every page, rate-limited |
| Triage preview (landing demo) | `POST /api/ai/triage-preview` | public demo on the landing page |

**Graceful degradation:** Gemini → GLM → deterministic rules. Every AI response is tagged with the provider that produced it. If AI fails/times out, tickets can still be handled manually.

### Realtime (Socket.IO — local / long-running hosts)
JWT-authenticated sockets with rooms per user / role / ticket: `ticket:new`, `ticket:updated`, `message:new`, typing indicators, live connection status in the header (**Live**).

### Synced mode (Vercel deployment)
Vercel serverless functions cannot hold WebSocket connections, so the deployed client leaves `VITE_SOCKET_URL` empty and automatically switches to **short-interval polling** (5–8s) — the header shows **Synced** instead of Live, and every list/dashboard/conversation keeps itself up to date.

### Frontend
- React 19 + Vite + TypeScript, custom hash router with auth guard
- **Poppins** font only (Google Fonts), **no gradients** (solid brand colors), **no glitch effects**
- Light theme `#3368A0 / #66A3BF / #F2EFE7` · dark theme `#3368A0 / #66A3BF / black`
- Animations: **Three.js** hero particle network, **GSAP + ScrollTrigger** scroll reveals, **Anime.js** animated counters, **Lenis** smooth scrolling
- Fully responsive (mobile 390px verified), toasts, skeletons, empty states

### Branding (logo + favicon)
- The SupportFlow logo ships in **two theme variants** — a dark-text wordmark for light mode and a white 3D-style wordmark for dark mode. Both are transparent PNGs in `client/public/` (`logo-light.png`, `logo-dark.png`, plus square `logo-mark-*` icon crops).
- A single `<Logo />` component (`client/src/components/supportflow/Logo.tsx`) renders both variants and switches instantly with the theme — it is used in the **landing navbar, footer, login/register cards, app header** (square mark on mobile, full wordmark on desktop) and the **AI chat header**.
- **Favicon** follows the theme too: `favicon-light.png` / `favicon-dark.png` are swapped live by the theme provider (and by a pre-paint script in `index.html`, so it is correct on the very first paint). `apple-touch-icon.png` covers iOS home-screen icons, and `og-image.png` (1200×630) is wired into the Open Graph / Twitter card meta tags.
- To swap the brand later, replace the PNGs in `client/public/` — no code changes needed.

### Security
- Passwords hashed with **bcrypt**, sessions via **JWT** (7-day expiry)
- Role-based route protection on both client and server
- Customers see only their tickets; agents only their assigned ones; AI key stays server-side
- Rate limiting on the public chatbot endpoint

---

## 6. Project Structure

```
supportflow-mern/
├── package.json              # root scripts (install-all, dev, seed, build)
│
├── server/                   # Express.js + Node.js + MongoDB + Socket.IO
│   ├── api/index.js          # Vercel serverless entry (same Express app)
│   ├── vercel.json           # rewrites /api/* → serverless function
│   ├── .env                  # your Atlas URI + Gemini key (pre-configured)
│   ├── package.json
│   └── src/
│       ├── app.js            # Express app factory (shared by both entries)
│       ├── index.js          # standalone entry: REST + Socket.IO + seeding
│       ├── config.js         # env config + categories/priorities/statuses
│       ├── db.js             # Atlas connection + embedded fallback
│       ├── models.js         # User, Ticket, Message, Counter (Mongoose)
│       ├── auth.js           # JWT sign/verify + role middleware
│       ├── socket.js         # Socket.IO rooms + realtime events
│       ├── seed.js           # demo users + tickets (idempotent)
│       ├── ai/
│       │   ├── provider.js   # Gemini → GLM → rules fallback chain
│       │   └── triage.js     # prompt + JSON validation for triage
│       └── routes/
│           ├── auth.js       # register / login / me
│           ├── tickets.js    # CRUD + workflow rules + AI actions
│           ├── ai.js         # chatbot + triage preview
│           └── stats.js      # dashboard statistics
│
└── client/                   # React 19 (Vite + TypeScript)
    ├── index.html            # Poppins (Google Fonts), meta, theme pre-paint
    ├── vite.config.ts        # react + tailwindcss plugins, "@" alias
    └── src/
        ├── main.tsx          # entry — ThemeProvider + SupportFlowApp
        ├── globals.css       # Tailwind v4 theme tokens (light/dark, brand)
        ├── lib/
        │   ├── api.ts        # fetch wrapper + JWT + error handling
        │   ├── socket.ts     # Socket.IO singleton + polling fallback
        │   ├── store.ts      # zustand store + hash router + auth
        │   ├── theme.tsx     # light/dark theme provider
        │   ├── avatar.ts     # profile picture (localStorage) helpers
        │   ├── types.ts      # shared API types
        │   └── utils.ts
        ├── hooks/            # use-supportflow, use-toast, use-mobile, use-hydrated
        ├── components/ui/    # shadcn-style primitives (button, dialog, toast…)
        └── components/supportflow/
            ├── SupportFlowApp.tsx   # root: routing + auth guard
            ├── LandingPage.tsx      # hero, marquee, bento, workflow, AI demo, CTA
            ├── AuthPages.tsx        # login / register (+ one-click demo logins)
            ├── AppShell.tsx         # authenticated layout + avatar + live status
            ├── ProfileSettings.tsx  # photo + details + password change
            ├── UserAvatar.tsx       # avatar with localStorage photo + initials
            ├── CustomerDashboard.tsx / AgentDashboard.tsx / AdminDashboard.tsx
            ├── TicketDetail.tsx     # conversation + AI panel + status controls
            ├── NewTicketDialog.tsx  # create ticket with AI triage reveal
            ├── ChatWidget.tsx       # "Flow" AI assistant
            ├── ThreeBackground.tsx  # Three.js hero
            └── … animation components (ScrollFloat, MagicBento, ScrollStack…)
```

---

## 7. API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account (name, email, password) |
| POST | `/api/auth/login` | – | Get JWT + user |
| GET | `/api/auth/me` | JWT | Current user |
| PATCH | `/api/auth/profile` | JWT | Update name, phone, company, location, bio |
| PATCH | `/api/auth/password` | JWT | Change password (requires current password) |
| GET | `/api/tickets` | JWT | Role-scoped ticket list |
| POST | `/api/tickets` | JWT | Create ticket (triggers AI triage) |
| GET | `/api/tickets/:id` | JWT | Ticket + messages + AI review |
| PATCH | `/api/tickets/:id/status` | JWT | Workflow transitions (rules enforced) |
| POST | `/api/tickets/:id/ai-review` | agent | Approve / edit / reject AI triage |
| POST | `/api/tickets/:id/claim` | agent | Take an unassigned ticket |
| POST | `/api/tickets/:id/resolution-draft` | agent | AI-drafted resolution note |
| POST | `/api/tickets/:id/reopen` | customer | Reopen resolved ticket |
| POST | `/api/tickets/:id/messages` | JWT | Send message (realtime broadcast) |
| POST | `/api/ai/chat` | – | AI chatbot (rate-limited) |
| POST | `/api/ai/triage-preview` | – | Public triage demo (not persisted) |
| GET | `/api/stats` | JWT | Dashboard statistics |
| GET | `/api/health` | – | Service + database mode |

Business rules enforced server-side: resolution **requires a note**, resolved tickets are **locked** (except customer reopen), agents can only act on **assigned** tickets, AI output is **validated** before storage.

---

## 8. Deploy to Vercel (production — MERN, both parts on Vercel)

The repo is wired for **two Vercel projects from one repository** — the Express API runs as a serverless function, the React client as a static site. Push the project to GitHub first, then:

### Step 1 — Deploy the backend (server)
1. [vercel.com](https://vercel.com) → **Add New → Project** → import your GitHub repo
2. **Root Directory**: `server` (click *Edit* next to the repo name) · Framework preset: **Other** · leave build command empty
3. **Environment Variables** (Production + Preview):

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | `mongodb+srv://socialmarketing225_db_user:…@cluster0.abuxx4x.mongodb.net/supportflow?retryWrites=true&w=majority&appName=Cluster0` |
   | `MONGODB_DB_NAME` | `supportflow` |
   | `JWT_SECRET` | any long random string (e.g. `openssl rand -hex 32`) — **required**, else sessions break |
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODELS` | `gemini-3.6-flash,gemini-flash-latest,gemini-2.0-flash` |
   | `AUTO_ASSIGN` | `false` (or `true` for the bonus feature) |

4. **Deploy** → note the URL, e.g. `https://supportflow-api.vercel.app`
5. Verify: `https://<your-api>.vercel.app/api/health` → `{"status":"ok","database":"mongodb-uri"}` — an empty database is auto-seeded with the demo accounts on the first request

### Step 2 — Deploy the frontend (client)
1. **Add New → Project** → same repo again
2. **Root Directory**: `client` · Framework preset: **Vite** (auto-detected) · Build: `npm run build` · Output: `dist`
3. **Environment Variables**:

   | Name | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-api>.vercel.app` (the Step 1 URL — no trailing slash) |
   | `VITE_SOCKET_URL` | *(do not set)* — serverless can't hold WebSockets; the app uses Synced (polling) mode |

4. **Deploy** → open the URL — the full app runs on Vercel

### Production checklist
- **Atlas Network Access**: `0.0.0.0/0` must be added (Section 4), otherwise the API returns a clear connection error
- **CORS**: already open (`cors()`) — cross-domain client→API calls work out of the box
- **JWT_SECRET**: set once and never change it (changing it signs everyone out)
- Realtime on Vercel = **Synced** mode (5–8s polling). For full Socket.IO **Live** mode, host `server/` on any long-running host (Render/Railway/VPS) with `npm start` and point `VITE_SOCKET_URL` at it
- Local development always runs in **Live** mode automatically (`client/.env` defaults)

---

## 9. Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot reach the SupportFlow server` | Is the server running on :3001? Check `curl localhost:3001/api/health` |
| Health says `embedded (local fallback)` | Atlas IP not whitelisted → add `0.0.0.0/0` in Network Access, restart |
| AI answers tagged `rules` or `glm` | Gemini key/region issue — the fallback chain kept the demo alive; check `GEMINI_API_KEY` |
| Port already in use | Change `PORT`/`SOCKET_PORT` in `server/.env` and `VITE_API_URL`/`VITE_SOCKET_URL` in `client/.env` |
| Fonts not loading offline | Poppins loads from Google Fonts; an internet connection is needed for exact typography (system fallback otherwise) |
| Vercel API 500 “MONGODB_URI is required” | Add the env vars from Step 1 and **redeploy** (env changes require a redeploy) |
| Vercel API 500 “Cannot reach MongoDB Atlas” | Atlas Network Access doesn't include Vercel → add `0.0.0.0/0` |
| Vercel client can't reach the API | `VITE_API_URL` must be the full `https://…vercel.app` URL without a trailing slash; it is baked in at build time → redeploy after changing |
| Profile picture gone after a browser reset | It lives in localStorage by design — just re-upload; account details and password live in MongoDB and never disappear |

---

## 10. AI Usage Declaration

Per hackathon rules, AI (Google Gemini) is used for: **ticket triage** (category, priority, summary, sentiment — with human approval required), **resolution note drafting** (agent-triggered), and the **customer-facing chatbot**. All AI output is validated and labeled with its provider; a deterministic fallback guarantees the workflow never blocks on an AI outage.
