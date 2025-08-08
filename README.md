# SentientEdge

Auto‑Adaptive Drone Autopilot and Battle Management Platform

## Overview
SentientEdge is a full‑stack platform for real‑time tactical mapping, drone fleet control, swarm coordination, mission planning, secure comms, AI lab workflows, and analytics. The app is built with Next.js, TypeScript, Tailwind, and ships with production infrastructure via Docker, Helm (Kubernetes), and GitHub Actions CI/CD.

## Features
- Real‑time tactical map (MapLibre GL) with live drone markers
- Drone fleet management (status, type, connection)
- Mission planning and execution (active/pending/completed)
- Secure comms UI (channels, message history)
- AI Lab (train/evaluate/deploy stubs)
- Simulation and swarm control interfaces
- Analytics dashboard (stubs)
- Health and data APIs backed by PostgreSQL

## Tech Stack
- Next.js (App Router), React, TypeScript
- Tailwind CSS
- PostgreSQL (+ PgBouncer optional)
- Redis (optional, for caching/pubsub)
- Docker, Helm, Kubernetes
- GitHub Actions for CI/CD

## Repository Layout
- `app/` — Next.js application (routes, pages, components)
- `components/` — UI and domain components
- `hooks/` — React data hooks (missions, drones, realtime stubs, auth)
- `lib/` — utilities (`db.ts`, `types.ts`, `config.ts`)
- `app/api/*` — API routes (`/health`, `/drones`, `/missions`)
- `database/init/*.sql` — schema, seed, functions
- `deploy/helm/sentientedge` — Helm chart (Deployment, Service, Ingress, Secret)
- `terraform/` — infra scaffolding (EKS, RDS, ElastiCache, etc.)
- `config/` — HAProxy/Nginx configs (local/dev options)

## Prerequisites
- Node.js 18.17+
- pnpm (recommended): `corepack enable` then `corepack use pnpm@8`
- PostgreSQL 14+ accessible via `DATABASE_URL`

## Local Development
1) Install deps
```bash
pnpm install
```
2) Set environment
Create `.env.local` with at least:
```bash
DATABASE_URL=postgresql://user:pass@host:5432/sentientedge
APP_VERSION=local
NEXT_PUBLIC_ENABLE_REALTIME=false
```
3) Start dev server
```bash
pnpm dev
# http://localhost:3000
```

## Database (Local)
Use the provided SQL to bootstrap a database quickly via Docker:
```bash
docker run --name se-postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres \
  -v "$(pwd)/database/init:/docker-entrypoint-initdb.d:ro" \
  -d postgres:15
# Then set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
```

## API Endpoints
- `GET /api/health` → status and version
- `GET /api/drones` → list drones from `core.drones`
- `GET /api/missions` → list missions from `core.missions`

## Production Build (Docker)
```bash
docker build -t ghcr.io/<org>/sentientedge:<tag> .
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/sentientedge \
  -e APP_VERSION=<tag> \
  ghcr.io/<org>/sentientedge:<tag>
```
Next.js is configured for `output: "standalone"` to keep runtime images small.

## Kubernetes Deploy (Helm)
```bash
helm upgrade --install sentientedge ./deploy/helm/sentientedge \
  --namespace sentientedge --create-namespace \
  --set image.repository=ghcr.io/<org>/sentientedge \
  --set image.tag=<tag> \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=<app-hostname> \
  --set secretEnv.DATABASE_URL="postgresql://user:pass@host:5432/sentientedge"
```
- Ensure your NGINX Ingress Controller is installed
- Point DNS for `<app-hostname>` to your ingress

## CI/CD (GitHub Actions)
A workflow at `.github/workflows/deploy.yml` builds the Docker image, pushes to GHCR, then deploys the Helm chart.

Required GitHub repo secrets:
- `KUBE_CONFIG_B64` — base64 kubeconfig (target cluster/namespace)
- `DATABASE_URL` — production Postgres URL
- `APP_HOSTNAME` — public hostname for ingress

On push to `main`, the workflow runs automatically.

## Scripts
- `pnpm dev` — start dev
- `pnpm build` — production build
- `pnpm start` — start production server
- `pnpm lint` — lint

## Troubleshooting
- Tailwind class issues: confirm `tailwind.config.js` `content` globs are correct
- DB errors: verify `DATABASE_URL` and that `database/init` ran
- Large git objects: avoid committing `.next` and `node_modules` (already ignored)

## License
Proprietary. All rights reserved.
