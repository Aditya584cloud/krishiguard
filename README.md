# KrishiGuard

A prototype for SIH problem statement **PS-02 — Smart Crop Advisory & Farmer
Distress Early-Warning System**. See [`backend/README.md`](backend/README.md)
for the full architecture, data sources, and how the distress risk model works.

## Layout

```
backend/    Fastify + Prisma + PostgreSQL API, ML risk model, mandi sync
frontend/   React + Vite web app (desktop/laptop)
mobile/     React + Vite + Capacitor Android app — same backend, same data
```

Each subproject is independent (own `package.json`, own `.gitignore`, own
README) but all three talk to the **same** backend API and the same database
— there is no duplicated business logic between frontend and mobile.

## Quick start

```bash
# 1. Database
cd backend && docker compose up -d

# 2. Backend
cp .env.example .env   # fill in DATABASE_URL / DATA_GOV_API_KEY
npm install
npx prisma migrate deploy
npm run dev             # http://localhost:8000

# 3. Web frontend
cd ../frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173

# 4. Mobile (Android) — see mobile/README.md for the full build/APK workflow
cd ../mobile
cp .env.example .env     # point VITE_API_BASE_URL at your backend
npm install
npm run dev
```
