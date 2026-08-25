# 🛡️ Sentinel SIEM — Backend

A production-ready TypeScript backend for the Sentinel SIEM platform, inspired by [Wazuh](https://wazuh.com/).

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | MongoDB (Mongoose ODM) |
| Real-Time | WebSockets (ws) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Logging | Winston |
| Rate Limiting | express-rate-limit |
| Security | Helmet, CORS |

---

## Project Structure

```
sentinel-backend/
├── src/
│   ├── server.ts              # Entry point
│   ├── app.ts                 # Express app + middleware
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── alert.controller.ts
│   │   ├── log.controller.ts
│   │   ├── report.controller.ts
│   │   ├── settings.controller.ts
│   │   ├── dashboard.controller.ts
│   │   └── ingest.controller.ts
│   ├── models/
│   │   ├── User.model.ts
│   │   ├── Alert.model.ts
│   │   ├── Log.model.ts
│   │   ├── Report.model.ts
│   │   └── Settings.model.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── alert.routes.ts
│   │   ├── log.routes.ts
│   │   ├── report.routes.ts
│   │   ├── settings.routes.ts
│   │   ├── dashboard.routes.ts
│   │   └── ingest.routes.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts  # JWT guard + RBAC
│   │   └── errorHandler.ts
│   ├── services/
│   │   └── correlationEngine.ts  # Rule-based threat detection
│   ├── websocket/
│   │   └── wsServer.ts           # Real-time WS broadcast
│   ├── utils/
│   │   ├── db.ts
│   │   ├── jwt.ts
│   │   └── logger.ts
│   └── scripts/
│       └── seed.ts              # Database seeder
├── logs/                        # Winston log files (auto-created)
├── .env.example
├── package.json
└── tsconfig.json
```

---

## ⚡ Quick Start (VS Code Terminal)

### 1 — Prerequisites

Make sure these are installed:

```bash
node --version    # >= 18
npm --version     # >= 9
mongod --version  # MongoDB >= 6 running locally
```

> **Install MongoDB** (if not installed):
> - macOS: `brew tap mongodb/brew && brew install mongodb-community`
> - Windows: Download from https://www.mongodb.com/try/download/community
> - Ubuntu: `sudo apt install -y mongodb`

---

### 2 — Place the backend folder

Your full project should look like:

```
SEIM/
├── seim/               ← Next.js frontend (existing)
└── sentinel-backend/   ← This backend folder
```

---

### 3 — Open backend in VS Code terminal

```bash
cd sentinel-backend
```

---

### 4 — Install dependencies

```bash
npm install
```

---

### 5 — Configure environment

```bash
# Copy the example env file
cp .env.example .env
```

Open `.env` and set your values (defaults work for local dev):

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/sentinel_siem
JWT_SECRET=your_super_secret_key_here
ALLOWED_ORIGINS=http://localhost:3000
AGENT_KEY=sentinel-agent-key-dev
```

---

### 6 — Start MongoDB (if not running as a service)

```bash
# macOS / Linux
mongod --dbpath ~/data/db

# Windows (run in a separate terminal)
"C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath C:\data\db
```

---

### 7 — Seed the database

```bash
npm run seed
```

This creates:
- 3 user accounts (admin / analyst / viewer)
- 50 realistic alerts
- 200 log entries
- 4 reports
- Default settings

**Seeded credentials:**
| Email | Password | Role |
|---|---|---|
| admin@sentinel.io | Sentinel@123 | Admin |
| analyst@sentinel.io | Sentinel@123 | Analyst |
| viewer@sentinel.io | Sentinel@123 | Viewer |

---

### 8 — Run in development mode

```bash
npm run dev
```

You should see:
```
✅  MongoDB connected → localhost
🛡️  Sentinel SIEM backend running on http://localhost:4000
🔌  WebSocket server co-hosted on ws://localhost:4000/ws
⚙️  Correlation engine started
```

---

### 9 — Build for production

```bash
npm run build
npm start
```

---

## 🌐 API Reference

Base URL: `http://localhost:4000/api/v1`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | ❌ | Register new analyst |
| POST | `/auth/login` | ❌ | Login → returns JWT |
| GET | `/auth/me` | ✅ | Get current user |

**Login example (Postman / curl):**
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sentinel.io","password":"Sentinel@123"}'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "name": "Admin User", "email": "admin@sentinel.io", "role": "admin" }
}
```

Add the token to all subsequent requests:
```
Authorization: Bearer <token>
```

---

### Dashboard

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard` | Aggregated stats, charts data, recent alerts |

---

### Alerts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/alerts` | List alerts (filter: severity, status, sourceIp, rule, page, limit) |
| GET | `/alerts/stats` | Count by severity/status |
| GET | `/alerts/:id` | Single alert |
| POST | `/alerts` | Create alert manually |
| PATCH | `/alerts/:id/acknowledge` | Acknowledge one alert |
| PATCH | `/alerts/bulk-acknowledge` | Acknowledge all (or list of IDs) |
| PATCH | `/alerts/:id/suppress` | Suppress alert |

**Filter example:**
```
GET /api/v1/alerts?severity=critical&status=open&page=1&limit=20
```

---

### Logs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/logs` | List logs (filter: level, protocol, sourceIp, search, from, to) |
| GET | `/logs/stats` | Count by level, protocol, timeline |
| GET | `/logs/:id` | Single log entry |

---

### Reports

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reports` | All reports |
| GET | `/reports/:id` | Single report |
| POST | `/reports` | Generate new report |
| DELETE | `/reports/:id` | Delete report (admin only) |

**Generate report:**
```bash
curl -X POST http://localhost:4000/api/v1/reports \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Weekly Threat Summary",
    "type": "weekly_threat",
    "periodStart": "2025-07-07",
    "periodEnd": "2025-07-14"
  }'
```

---

### Settings

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/settings` | analyst+ | Get system settings |
| PUT | `/settings` | admin only | Update settings |

---

### Log Ingestion (Agent API)

These endpoints are for security agents/forwarders, authenticated by `X-Agent-Key` header:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/ingest/event` | Ingest single event |
| POST | `/ingest/bulk` | Ingest batch of events |

**Single event ingestion:**
```bash
curl -X POST http://localhost:4000/api/v1/ingest/event \
  -H "X-Agent-Key: sentinel-agent-key-dev" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "ERROR",
    "sourceIp": "192.168.1.100",
    "protocol": "TCP",
    "message": "SYN flood detected — 9000 pps",
    "agentId": "agent-01",
    "hostname": "firewall-01"
  }'
```

The correlation engine automatically evaluates every ingested event against all rules and creates alerts when rules fire.

---

## 🔌 WebSocket

Connect to: `ws://localhost:4000/ws`

With JWT auth: `ws://localhost:4000/ws?token=<jwt>`

**Message types emitted by server:**

| Type | When |
|---|---|
| `CONNECTED` | On successful connection |
| `NEW_ALERT` | Correlation engine fires a rule |
| `ALERT_UPDATED` | Alert acknowledged/suppressed |
| `BULK_ACKNOWLEDGED` | Bulk acknowledge |
| `NEW_LOG` | New log ingested |
| `BULK_LOGS` | Batch logs ingested |
| `HEARTBEAT` | Every 30 seconds |

**Client → Server:**
| Type | Effect |
|---|---|
| `PING` | Server replies `PONG` |

**Test with wscat:**
```bash
npm install -g wscat
wscat -c "ws://localhost:4000/ws?token=<your_jwt>"
```

---

## 🔗 Connecting the Frontend

In your Next.js frontend, update API calls to point to `http://localhost:4000/api/v1`.

**Example: Replace static ALERTS data in `app/alerts/page.tsx`:**

```typescript
// At top of component
const [alerts, setAlerts] = useState([]);
const token = localStorage.getItem("sentinel_token");

useEffect(() => {
  fetch("http://localhost:4000/api/v1/alerts?limit=50", {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(r => r.json())
    .then(data => setAlerts(data.data));
}, []);
```

**Example: Login page (`app/auth/page.tsx`):**
```typescript
const login = async () => {
  const res = await fetch("http://localhost:4000/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("sentinel_token", data.token);
    router.push("/");
  }
};
```

**Example: WebSocket for real-time alerts:**
```typescript
useEffect(() => {
  const token = localStorage.getItem("sentinel_token");
  const ws = new WebSocket(`ws://localhost:4000/ws?token=${token}`);
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === "NEW_ALERT") {
      setAlerts(prev => [msg.payload, ...prev]);
    }
  };
  return () => ws.close();
}, []);
```

---

## 🧪 Postman Collection

Import this collection into Postman for instant API testing:

1. Open Postman → Import → Raw Text
2. Paste the JSON from `postman_collection.json` (generate via: File → Export)

Or use the **VS Code REST Client** extension with `.http` files.

---

## 📦 MongoDB Compass

To view your data visually:

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to: `mongodb://localhost:27017`
3. Select database: `sentinel_siem`
4. Collections: `users`, `alerts`, `logs`, `reports`, `settings`

---

## 🔐 Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP server port |
| `MONGO_URI` | `mongodb://localhost:27017/sentinel_siem` | MongoDB connection string |
| `JWT_SECRET` | *(required in prod)* | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | Token expiry |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | CORS allowed origins |
| `AGENT_KEY` | `sentinel-agent-key-dev` | Agent ingestion auth key |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `200` | Max requests per window |
| `LOG_LEVEL` | `info` | Winston log level |

---

## 🚀 npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run seed` | Seed MongoDB with sample data |

---

## 🏗️ Architecture Overview

```
Frontend (Next.js :3000)
        │
        │  REST API (HTTP)
        ▼
┌───────────────────────────────┐
│   Express.js Server (:4000)   │
│                               │
│  ┌─────────┐ ┌─────────────┐  │
│  │  Routes │ │  Middleware │  │
│  └────┬────┘ └──────┬──────┘  │
│       │             │         │
│  ┌────▼─────────────▼──────┐  │
│  │      Controllers        │  │
│  └────────────┬────────────┘  │
│               │               │
│  ┌────────────▼────────────┐  │
│  │   Mongoose Models       │  │
│  └────────────┬────────────┘  │
└───────────────┼───────────────┘
                │
        ┌───────▼───────┐
        │   MongoDB     │
        └───────────────┘

        ┌───────────────────┐
        │  Correlation      │
        │  Engine (rules)   │──► WebSocket broadcast
        └───────────────────┘        │
                                     ▼
                            Frontend dashboards
                            (real-time updates)
```
