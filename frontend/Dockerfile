FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

# Vite dev server accessible from Docker host
CMD ["pnpm", "exec", "vite", "--host", "0.0.0.0"]
