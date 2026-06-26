# Atrioom — Sistem Inti (SaaS)

Operational Dashboard & Front-Desk system for Atrioom.

## Stack
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind
- **Backend:** Node.js + Fastify + TypeScript
- **DB / Auth:** Supabase (Postgres + Auth + Realtime)
- **Deploy:** Railway (Blue-Green via staging → main)
- **Workspace:** pnpm

## Struktur
```
apps/
  web/   ← Next.js (Operator Dashboard + PWA)
  api/   ← Node.js + Fastify (Internal API)
packages/
  ui-tokens/   ← design tokens (copy dari Company Profile)
  types/       ← shared TS types (placeholder di EPIC00)
  validators/  ← shared Zod schemas (placeholder di EPIC00)
```

## Branches
- `main`         — production (locked, hanya dari `staging`)
- `staging`      — pra-prod
- `feature/*`    — harian
- `fix/*`        — perbaikan

## Conventional Commits
Wajib. Lihat `.commitlintrc` (akan ditambah saat CI).