# ─── Stage 1: Build Frontend ───
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY frontend/package.json ./frontend/
RUN npm ci --workspace=@billing/shared --workspace=@billing/frontend
COPY packages/shared ./packages/shared
COPY frontend ./frontend
RUN npm run build --workspace=@billing/frontend

# ─── Stage 2: Build Backend ───
FROM node:22-alpine AS backend-build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
RUN npm ci --workspace=@billing/shared --workspace=@billing/backend
COPY packages/shared ./packages/shared
COPY backend ./backend
RUN npx prisma generate --schema=backend/prisma/schema.prisma
RUN npm run build --workspace=@billing/backend

# ─── Stage 3: Production Image ───
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY backend/package.json ./backend/
RUN npm ci --workspace=@billing/shared --workspace=@billing/backend --omit=dev

# Copy built backend
COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/prisma ./backend/prisma
COPY --from=backend-build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/packages/shared ./packages/shared

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create uploads directory
RUN mkdir -p /app/uploads /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/index.js"]
