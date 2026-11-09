# syntax=docker/dockerfile:1

# Node 22 (project requires >=20). Debian slim keeps Prisma's native engine happy.
FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Build stage -----------------------------------------------------------
FROM base AS builder
COPY . .
# The committed package-lock.json is out of sync with the workspaces
# (packages/db is missing), so `npm ci` would fail. `npm install` reconciles it.
RUN npm install
# Next.js only needs a datasource URL at build time; the real DB is mounted at runtime.
ENV DATABASE_URL="file:/tmp/build.db"
RUN npm run build

# ---- Runtime stage ---------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

# Full monorepo is needed because @ghostshare/db is consumed as TS source
# and the Prisma CLI is used for migrations on startup.
COPY --from=builder --chown=nextjs:nodejs /app ./

# Persistent SQLite location (mount a volume here).
RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs
EXPOSE 3000

# Apply pending migrations, then start Next.js.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema packages/db/prisma/schema.prisma && exec ./node_modules/.bin/next start apps/web -H 0.0.0.0 -p 3000"]
