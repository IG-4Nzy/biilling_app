# ECMF Billing System — Deployment Guide

## Architecture

```mermaid
graph LR
  U[Browser] --> N[Node.js :4000]
  N --> P[(PostgreSQL)]
  N --> R[(Redis)]
  N --> F[Static Frontend]
  N --> UP[/uploads/]
```

The app runs as a **single Node.js process** that serves:
- The API backend (Express)
- The frontend (Vite-built static files)
- Uploaded files (logos, etc.)

---

## Option 1: VPS/Server (Recommended for Production)

### Prerequisites on Your Server
- **Node.js 22+**
- **PostgreSQL 16**
- **Redis 7**
- **Nginx** (reverse proxy)

### Step-by-Step

#### 1. Clone & Install
```bash
git clone <your-repo-url> /opt/ecmf
cd /opt/ecmf
npm ci
```

#### 2. Create `.env` file
```bash
cp .env.example .env   # or create manually
```

```env
NODE_ENV=production
PORT=4000

# Database (change these!)
DATABASE_URL=postgresql://ecmf_user:STRONG_PASSWORD@localhost:5432/ecmf_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT secrets (generate random strings!)
JWT_ACCESS_SECRET=your-random-64-char-secret-here
JWT_REFRESH_SECRET=another-random-64-char-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption key (must be exactly 32 characters)
ENCRYPTION_KEY=your-32-character-encryption-key!

# Frontend URL (your domain)
FRONTEND_URL=https://billing.yourdomain.com
```

> [!CAUTION]
> Generate real secrets! Use `openssl rand -hex 32` for each secret.

#### 3. Setup Database
```bash
# Create database
sudo -u postgres psql -c "CREATE USER ecmf_user WITH PASSWORD 'STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE ecmf_db OWNER ecmf_user;"

# Run migrations
npx prisma migrate deploy --schema=backend/prisma/schema.prisma

# Seed initial data (admin user, etc.)
npx tsx backend/prisma/seed.ts
```

#### 4. Build
```bash
# Build frontend (React → static files)
npm run build:frontend

# Build backend (TypeScript → JavaScript)
npm run build:backend
```

#### 5. Test Run
```bash
NODE_ENV=production node backend/dist/index.js
# Should show: ECMF Billing System v1.0.0 on port 4000
```

#### 6. Process Manager (PM2)
```bash
npm install -g pm2

pm2 start backend/dist/index.js --name ecmf-billing
pm2 save
pm2 startup   # auto-start on reboot
```

#### 7. Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name billing.yourdomain.com;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/ecmf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

#### 8. SSL (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d billing.yourdomain.com
```

---

## Option 2: Docker (Easiest)

The project includes a `Dockerfile` and `docker-compose.yml`.

#### 1. Update `docker-compose.yml` to include the app
Add this to `docker-compose.yml` after the redis service:

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
      JWT_ACCESS_SECRET: change-this-to-random-secret
      JWT_REFRESH_SECRET: change-this-to-another-secret
      ENCRYPTION_KEY: your-32-character-encryption-key!
      FRONTEND_URL: https://billing.yourdomain.com
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

#### 2. Build & Run
```bash
docker compose up -d --build
```

#### 3. Seed the database (first time only)
```bash
docker compose exec app npx tsx backend/prisma/seed.ts
```

Then add Nginx reverse proxy as shown above.

---

## Option 3: Railway / Render (Cloud PaaS)

### Railway
1. Push code to GitHub
2. Go to [railway.app](https://railway.app), create new project
3. Add **PostgreSQL** and **Redis** plugins
4. Add your repo as a service
5. Set environment variables (Railway auto-fills `DATABASE_URL` and `REDIS_URL`)
6. Set build command: `npm run build`
7. Set start command: `npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js`

### Render
1. Push code to GitHub
2. Create a **Web Service** on [render.com](https://render.com)
3. Add **PostgreSQL** and **Redis** from Render dashboard
4. Set build command: `npm ci && npm run build`
5. Set start command: `npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js`
6. Add env variables

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` |
| `PORT` | No | Default: `4000` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `JWT_ACCESS_SECRET` | Yes | Random secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Random secret for refresh tokens |
| `ENCRYPTION_KEY` | Yes | Exactly 32 characters |
| `FRONTEND_URL` | Yes | Your domain URL |

---

## Post-Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Seed data created (admin user)
- [ ] SSL certificate installed
- [ ] Uploads directory is persistent (not wiped on redeploy)
- [ ] Environment secrets are **not** committed to git
- [ ] Test login at `https://your-domain.com`
- [ ] Test invoice creation and PDF print
- [ ] Test logo upload
