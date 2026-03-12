FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json

RUN pnpm install --filter @efvm360/backend... --frozen-lockfile

COPY backend backend

WORKDIR /app/backend
RUN pnpm build

FROM node:20-alpine AS production

RUN apk add --no-cache curl
RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json

RUN pnpm install --filter @efvm360/backend --prod --frozen-lockfile

COPY --from=builder /app/backend/dist /app/backend/dist

WORKDIR /app/backend
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

CMD ["pnpm", "start"]
