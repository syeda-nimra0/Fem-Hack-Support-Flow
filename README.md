# SupportFlow — AI-Assisted Customer Support Desk

> Built for the SMIT Hackathon (AI Factory 2.0, Task D — SupportFlow).
>
> **Stack:** React + Node.js + Express + MongoDB Atlas (MERN) + Google Gemini AI.
>
> **Deploy:** Vercel-ready (frontend + backend in one project).

SupportFlow is a focused, MVP customer support desk that demonstrates the full ticket
lifecycle: customer submits → AI triages → agent reviews → agent responds → resolved.
**Plus an AI Agent Helper** that drafts replies, generates resolution notes, summarizes
threads, and finds similar tickets — all powered by Google Gemini.

---

## ✨ Features

### Core workflow
- **Authentication** with JWT, role-based (customer / agent / admin).
- **Customer ticket creation** with subject, description, and optional category.
- **Unique ticket number** generated for every ticket (`SF-XXXXXXXX`).
- **Status workflow:** `New → Assigned → In Progress → Resolved`.
- **AI ticket triage** — Gemini analyzes the ticket and suggests category, priority, summary, confidence.
- **Human-in-the-loop review** — agents edit AI suggestions before saving.
- **Graceful fallback** — rule-based triage if Gemini is unavailable.
- **Real-time chat** (Socket.IO in dev, polling fallback on Vercel).
- **Resolution required** — a ticket cannot be marked Resolved without a resolution note.
- **Live dashboard statistics** based on actual ticket data.

### 🤖 AI Agent Helper
- **Suggest Reply** — Gemini drafts a professional customer-facing reply
- **Draft Resolution** — Gemini generates a concise resolution note
- **Summarize Thread** — Gemini summarizes the conversation
- **Similar Tickets** — keyword-based similar ticket detection

### Frontend polish
- **Preloader** — animated loading screen while fonts + Three.js initialize
- **Poppins** font throughout, **no gradients**, **no GlitchText**
- **Three.js** hero scene (animated particle network)
- **GSAP** + ScrollTrigger (character-by-character heading reveals, staggered animations)
- **anime.js** (fluid tab indicator)
- **Lenis** (buttery smooth scrolling)
- **GlareHover**, **DonutChart**, **SlideArrowButton** components (from code.md / Code 2.md)
- Fully **responsive** with skeleton loaders and clear loading/error states

---

## 🚀 Deployment on Vercel (Production)

This project is configured for **one-click Vercel deployment**. Both frontend and backend
deploy as a single Vercel project.

### Step 1: Push to GitHub
```bash
cd supportflow
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/supportflow.git
git push -u origin main
```

### Step 2: Import to Vercel
1. Go to <https://vercel.com> and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Vercel will auto-detect the configuration from `vercel.json`

### Step 3: Set Environment Variables
In the Vercel project settings, go to **Settings → Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://ahsanmohommad546_db_user:ypFKRmEZJuCXPTxv@cluster0.8gw5cjp.mongodb.net` |
| `JWT_SECRET` | `sdfrehgfnhkyujgvnhdsgreqgkilithfvcv` |
| `GEMINI_API_KEY` | `AQ.Ab8RN6I-ZJjQM3AYAb10f00wMmngIh6xdCwK--KAdCyqc1gl1w` |
| `GEMINI_API_BASE` | `https://generativelanguage.googleapis.com/v1beta` |
| `GEMINI_MODEL` | `gemini-3.6-flash` |

Make sure to add these for all environments: **Production**, **Preview**, and **Development**.

### Step 4: Deploy
Click **Deploy**. Vercel will:
1. Run `npm run build` (builds the React client)
2. Deploy `/api/index.js` as a serverless function (Express backend)
3. Serve the built client as static files
4. Route `/api/*` to the serverless function

Your app will be live at `https://your-project.vercel.app` 🎉

### Step 5: Whitelist your IP on MongoDB Atlas
**Important:** Go to your MongoDB Atlas dashboard → **Network Access** → **Add IP Address** →
**Allow Access From Anywhere** (`0.0.0.0/0`). This is required because Vercel's serverless
functions use dynamic IPs.

### Step 6: Seed the database (first time only)
After deployment, the database will auto-seed on the first API request. To manually trigger it,
visit:
```
https://your-project.vercel.app/api/health
```
This will connect to MongoDB and seed demo users + tickets if the database is empty.

---

## 💻 Local Development

### Prerequisites
- Node.js 18+ (Node 20 or 22 LTS recommended)
- MongoDB Atlas connection string (already configured in `server/.env`)

### Install and run
```bash
# At the project root
npm run install:all    # Installs root, server, and client deps

# Run both server and client in dev mode
npm run dev

# Or run them separately:
npm run dev:server     # → http://localhost:5000
npm run dev:client     # → http://localhost:5173
```

Open <http://localhost:5173> and sign in with demo credentials.

### Troubleshooting npm install on Windows

If you see `EPERM` errors:
1. Close VS Code and any other programs that may have files open in the project folder
2. Delete `node_modules` and `package-lock.json`:
   ```cmd
   rmdir /s /q node_modules
   del package-lock.json
   ```
3. Run `npm install` again (without `--force`)

If you see `Cannot find module` errors after a failed install:
1. Open Task Manager (`Ctrl + Shift + Esc`) and end any `node.exe` processes
2. Delete `node_modules` and `package-lock.json`
3. Run `npm cache clean --force`
4. Run `npm install` again

---

## 🔐 Demo credentials

Auto-seeded on first run:

| Role     | Email                          | Password       |
|----------|--------------------------------|----------------|
| Customer | `customer@supportflow.demo`    | `password123`  |
| Customer | `priya@supportflow.demo`       | `password123`  |
| Agent    | `agent@supportflow.demo`       | `password123`  |
| Agent    | `mike@supportflow.demo`        | `password123`  |
| Admin    | `admin@supportflow.demo`       | `password123`  |

---

## 📁 Project structure

```
supportflow/
├── api/                          # Vercel serverless function
│   └── index.js                  # Exports Express app for Vercel
├── server/                       # Express + MongoDB backend
│   ├── src/
│   │   ├── app.js                # Express app (shared with Vercel)
│   │   ├── server.js             # Dev entry (listen + Socket.IO)
│   │   ├── config/               # env + DB connection
│   │   ├── controllers/          # auth, ticket
│   │   ├── middleware/           # JWT auth, error handling
│   │   ├── models/               # User, Ticket (Mongoose)
│   │   ├── routes/               # /api/auth, /api/tickets
│   │   ├── services/             # triageService, agentHelperService
│   │   ├── socket/               # Socket.IO (dev only)
│   │   └── utils/seed.js         # Demo data seeder
│   ├── .env                      # Local env (MongoDB + Gemini)
│   └── package.json
├── client/                       # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── anim/             # ScrollFloat, GlareHover, DonutChart, etc.
│   │   │   ├── three/            # HeroScene (Three.js)
│   │   │   ├── dashboard/        # AgentHelperPanel, ActivityFeed
│   │   │   ├── layout/           # PublicNav, AppShell, Footer
│   │   │   ├── ui/               # Logo, TicketCard, StatusBadge
│   │   │   ├── Preloader.jsx     # Loading screen
│   │   │   └── utils/
│   │   ├── context/AuthContext.jsx
│   │   ├── hooks/useSocket.js    # Real-time + polling fallback
│   │   ├── lib/                  # api.js, socket.js, lenis.js, utils.js
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx   # Three.js + GSAP + Lenis showcase
│   │   │   ├── auth/             # Login, Register
│   │   │   ├── customer/         # Dashboard, Tickets, NewTicket
│   │   │   ├── agent/            # Dashboard, Tickets
│   │   │   ├── admin/            # Dashboard with stats
│   │   │   └── shared/TicketDetailPage.jsx  # Chat + AI triage + AI Helper
│   │   ├── styles/globals.css    # Poppins, color system, utilities
│   │   └── App.jsx               # Routes + auth guards + Preloader
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── vercel.json                   # Vercel deployment config
├── .vercelignore                 # Files to exclude from Vercel
├── .env.vercel                   # Reference for Vercel env vars
├── package.json                  # Root with build/dev scripts
└── README.md
```

---

## 📡 API overview

All routes under `/api`. Auth via `Authorization: Bearer <token>` header.

### Auth
| Method | Route             | Description                |
|--------|-------------------|----------------------------|
| POST   | `/auth/register`  | Register customer or agent |
| POST   | `/auth/login`     | Login, returns JWT + user  |
| GET    | `/auth/me`        | Current user               |

### Tickets
| Method | Route                                | Description                                   |
|--------|--------------------------------------|-----------------------------------------------|
| GET    | `/tickets`                           | List (scoped by role)                         |
| GET    | `/tickets/stats`                     | Dashboard statistics                          |
| GET    | `/tickets/activity`                  | Recent activity feed                          |
| POST   | `/tickets`                           | Create + AI triage                            |
| GET    | `/tickets/:id`                       | Single ticket with messages                   |
| POST   | `/tickets/:id/review-triage`         | Review/edit AI suggestion + assign            |
| POST   | `/tickets/:id/assign`                | Assign to self                                |
| PATCH  | `/tickets/:id/status`                | Change status (resolution required for resolved) |
| POST   | `/tickets/:id/messages`              | Add message to conversation                   |
| POST   | `/tickets/:id/typing`                | Typing indicator                              |

### AI Agent Helper
| Method | Route                                | Description                                   |
|--------|--------------------------------------|-----------------------------------------------|
| GET    | `/tickets/:id/ai-suggest-reply`      | Gemini-drafted reply suggestion               |
| GET    | `/tickets/:id/ai-resolution-draft`   | Gemini-drafted resolution note                |
| GET    | `/tickets/:id/ai-summarize`          | Gemini summary of the conversation            |
| GET    | `/tickets/:id/similar`               | Keyword-based similar tickets                 |

---

## 🤖 AI integration

### Triage (automatic, on ticket creation)
1. **If `GEMINI_API_KEY` is set** → calls Google Gemini `generateContent` API with a strict JSON schema.
2. **On any failure** → falls back to a rule-based engine (keyword scoring).
3. **Output is always validated** before being stored.

### Agent Helper (on-demand, inside ticket detail)
- **Suggest Reply** — drafts a professional customer-facing reply
- **Draft Resolution** — generates a 1-2 sentence resolution note
- **Summarize Thread** — produces a 3-4 bullet-point summary
- **Similar Tickets** — keyword-based Jaccard similarity (no LLM cost)

All Gemini calls are server-side only — the API key is never exposed to the frontend.

---

## ⚡ Real-time behavior

- **Local dev:** Socket.IO provides instant real-time updates (messages, status changes, typing indicators).
- **Vercel production:** Socket.IO is not supported on serverless. The client **automatically falls back to polling** every 8-15 seconds. All features still work — updates just take a few seconds to appear instead of being instant.

---

## 🛡️ Business rules enforced

- ✅ Only authenticated users may access protected ticket areas.
- ✅ Customers can view only their own tickets.
- ✅ Agents can update only tickets assigned to them.
- ✅ A resolved ticket cannot be modified through the normal workflow.
- ✅ Priority must be one of `low` / `medium` / `high`.
- ✅ AI output is validated before being stored.
- ✅ AI/API keys are never exposed in frontend code.
- ✅ A ticket cannot be marked Resolved without a resolution note.

---

## 🧱 Tech stack

| Layer        | Tech                                                     |
|--------------|----------------------------------------------------------|
| Frontend     | React 18, Vite 5, React Router 6                         |
| Animations   | Three.js + @react-three/fiber, GSAP + ScrollTrigger, anime.js, Lenis |
| Backend      | Node.js, Express 4                                       |
| Database     | MongoDB Atlas                                            |
| ODM          | Mongoose 8                                               |
| Real-time    | Socket.IO 4 (dev) + polling fallback (Vercel)            |
| Auth         | JWT + bcryptjs                                           |
| AI           | Google Gemini + rule-based fallback                      |
| Deploy       | Vercel (serverless functions + static)                   |

---

Built for SMIT Hackathon — AI Factory 2.0, Task D (SupportFlow).
