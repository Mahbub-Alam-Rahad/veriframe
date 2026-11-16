# syntax=docker/dockerfile:1.7

# Next.js standalone image. Build context is the repository root so the
# pnpm workspace lockfile and outputFileTracingRoot are consistent.

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @deepfake/web...

FROM deps AS build
COPY apps/web ./apps/web

ARG API_INTERNAL_URL=http://api:3001
ARG NEXT_PUBLIC_API_BASE=/api/v1
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ENV API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @deepfake/web build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

RUN useradd --create-home --uid 10001 veriframe

WORKDIR /app

COPY --from=build --chown=veriframe:veriframe /app/apps/web/.next/standalone ./
COPY --from=build --chown=veriframe:veriframe /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=veriframe:veriframe /app/apps/web/public ./apps/web/public

RUN mkdir -p /app/apps/web/.next/cache \
    && chown -R veriframe:veriframe /app/apps/web/.next/cache

USER veriframe

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
