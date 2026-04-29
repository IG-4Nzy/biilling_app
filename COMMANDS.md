# ECMF Billing System — Commands Reference

## Table of Contents
- [Prerequisites](#prerequisites)
- [Running Without Docker](#running-without-docker)
- [Running With Docker](#running-with-docker)
- [Database Commands](#database-commands)
- [Build Commands](#build-commands)
- [Useful Commands](#useful-commands)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Software | Version | Check Command |
|----------|---------|---------------|
| Node.js | 22+ | `node -v` |
| npm | 10+ | `npm -v` |
| PostgreSQL | 16+ | `psql --version` |
| Redis | 7+ | `redis-cli --version` |
| Docker | 24+ | `docker --version` |

---

## Running Without Docker

### First Time Setup

```bash
# 1. Clone the project
git clone <repo-url>
cd "Billing App"

# 2. Install all dependencies
npm install

# 3. Start PostgreSQL and Redis (using Docker for databases only)
docker compose up -d

# 4. Generate Prisma client
npx prisma generate --schema=backend/prisma/schema.prisma

# 5. Run database migrations (creates tables)
npx prisma migrate deploy --schema=backend/prisma/schema.prisma

# 6. Seed the database (creates admin user, sample products, tax configs)
npx tsx backend/prisma/seed.ts

# 7. Start both frontend and backend
npm run dev
```

### Daily Development (after first time)

```bash
# Start databases (if not running)
docker compose up -d

# Start the app (backend + frontend together)
npm run dev

# OR start separately:
npm run dev:backend    # Backend on http://localhost:4000
npm run dev:frontend   # Frontend on http://localhost:5173
```

### Stop Everything

```bash
# Stop the Node.js servers
# Press Ctrl+C in the terminal

# Stop databases
docker compose down

# Stop databases AND delete all data
docker compose down -v
```

---

## Running With Docker (Full Containerized)

### Build & Run Everything in Docker

```bash
# 1. Build the Docker image
docker build -t ecmf-billing .

# 2. Start everything (PostgreSQL + Redis + App)
docker compose -f docker-compose.yml up -d

# If you've added the app service to docker-compose.yml:
docker compose up -d --build

# 3. Run migrations inside the container
docker compose exec app npx prisma migrate deploy --schema=backend/prisma/schema.prisma

# 4. Seed the database
docker compose exec app npx tsx backend/prisma/seed.ts
```

### Docker Commands

```bash
# View running containers
docker compose ps

# View app logs
docker compose logs -f app

# View database logs
docker compose logs -f postgres

# Restart the app
docker compose restart app

# Rebuild and restart (after code changes)
docker compose up -d --build app

# Stop everything
docker compose down

# Stop everything AND delete all data (volumes)
docker compose down -v

# Remove all Docker images for this project
docker rmi ecmf-billing
```

### Convert to Docker (first time)

Add this to your `docker-compose.yml` after the redis service:

```yaml
  app:
    build: .
    container_name: ecmf_app
    restart: unless-stopped
    ports:
      - '4000:4000'
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://billing_user:billing_pass@postgres:5432/billing_db
      REDIS_URL: redis://redis:6379
      JWT_ACCESS_SECRET: generate-a-random-secret-here
      JWT_REFRESH_SECRET: generate-another-secret-here
      ENCRYPTION_KEY: your-32-character-encryption-key!
      FRONTEND_URL: http://localhost:4000
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

Then run:
```bash
docker compose up -d --build
```

---

## Database Commands

### Migrations

```bash
# Create a new migration (after changing schema.prisma)
npx prisma migrate dev --schema=backend/prisma/schema.prisma --name describe_change

# Apply pending migrations (production)
npx prisma migrate deploy --schema=backend/prisma/schema.prisma

# Check migration status
npx prisma migrate status --schema=backend/prisma/schema.prisma

# Reset database (drops all tables, re-runs migrations)
npx prisma migrate reset --schema=backend/prisma/schema.prisma
```

### Seed Data

```bash
# Seed database (admin user, sample products, tax configs)
npx tsx backend/prisma/seed.ts
```

> Login credentials after seeding:
> - **Admin:** admin@billing.com / Admin@1234
> - **Staff:** staff@billing.com / Staff@1234

### Clear / Reset Database

```bash
# Option 1: Reset via Prisma (drop all tables + re-migrate + re-seed)
npx prisma migrate reset --schema=backend/prisma/schema.prisma

# Option 2: Drop and recreate via SQL
psql -U billing_user -d billing_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
npx tsx backend/prisma/seed.ts

# Option 3: Clear specific tables only (via Prisma Studio)
npx prisma studio --schema=backend/prisma/schema.prisma

# Option 4: Docker — destroy database volume and start fresh
docker compose down -v
docker compose up -d
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
npx tsx backend/prisma/seed.ts
```

### Database UI (Prisma Studio)

```bash
# Opens a web UI to browse/edit database at http://localhost:5555
npx prisma studio --schema=backend/prisma/schema.prisma
```

### Regenerate Prisma Client

```bash
# Run this after changing schema.prisma
npx prisma generate --schema=backend/prisma/schema.prisma
```

---

## Build Commands

```bash
# Build everything (frontend + backend)
npm run build

# Build frontend only (outputs to frontend/dist/)
npm run build:frontend

# Build backend only (outputs to backend/dist/)
npm run build:backend

# Start production server (after building)
NODE_ENV=production node backend/dist/index.js
```

---

## Useful Commands

### Redis

```bash
# Connect to Redis CLI
redis-cli

# Clear all Redis cache
redis-cli FLUSHALL

# Check Redis memory usage
redis-cli INFO memory
```

### Logs & Debugging

```bash
# Check if backend port is in use
lsof -i :4000

# Check if frontend port is in use
lsof -i :5173

# Kill process on a specific port
lsof -ti:4000 | xargs kill -9

# View backend logs (if using PM2)
pm2 logs ecmf-billing
```

### Generate Secrets (for production .env)

```bash
# Generate JWT secrets
openssl rand -hex 32

# Generate encryption key (32 characters)
openssl rand -base64 24
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# App
NODE_ENV=development          # or 'production'
PORT=4000

# Database
DATABASE_URL=postgresql://billing_user:billing_pass@localhost:5432/billing_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT (change in production!)
JWT_ACCESS_SECRET=dev-access-secret-change-this-in-production-please
JWT_REFRESH_SECRET=dev-refresh-secret-change-this-in-production-please
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption (exactly 32 characters)
ENCRYPTION_KEY=dev-encryption-key-32-bytes-long!

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on port 5432 | PostgreSQL not running → `docker compose up -d postgres` |
| `ECONNREFUSED` on port 6379 | Redis not running → `docker compose up -d redis` |
| Port 4000 already in use | Kill it → `lsof -ti:4000 \| xargs kill -9` |
| Port 5173 already in use | Kill it → `lsof -ti:5173 \| xargs kill -9` |
| Prisma client outdated | Regenerate → `npx prisma generate --schema=backend/prisma/schema.prisma` |
| Database schema changed | Migrate → `npx prisma migrate dev --schema=backend/prisma/schema.prisma` |
| Fresh start needed | Reset → `npx prisma migrate reset --schema=backend/prisma/schema.prisma` |
| Docker volumes stale | `docker compose down -v && docker compose up -d` |
| npm install fails | Delete and retry → `rm -rf node_modules package-lock.json && npm install` |

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────┐
│              ECMF Billing System                     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  START (dev):     npm run dev                        │
│  START (prod):    node backend/dist/index.js         │
│  BUILD:           npm run build                      │
│  DB MIGRATE:      npx prisma migrate deploy          │
│  DB SEED:         npx tsx backend/prisma/seed.ts     │
│  DB RESET:        npx prisma migrate reset           │
│  DB STUDIO:       npx prisma studio                  │
│  DOCKER UP:       docker compose up -d               │
│  DOCKER DOWN:     docker compose down                │
│  DOCKER NUKE:     docker compose down -v             │
│                                                      │
│  Backend:    http://localhost:4000                    │
│  Frontend:   http://localhost:5173                    │
│  DB Studio:  http://localhost:5555                    │
│  Health:     http://localhost:4000/api/health         │
│                                                      │
│  Admin:  admin@billing.com / Admin@1234              │
│  Staff:  staff@billing.com / Staff@1234              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

> **Note:** All Prisma commands require `--schema=backend/prisma/schema.prisma` flag because the schema file is not in the default location.
