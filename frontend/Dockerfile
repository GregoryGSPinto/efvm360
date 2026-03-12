FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json

RUN pnpm install --filter @efvm360/frontend... --frozen-lockfile

COPY frontend frontend

WORKDIR /app/frontend

EXPOSE 5173

CMD ["pnpm", "dev", "--", "--host", "0.0.0.0"]
