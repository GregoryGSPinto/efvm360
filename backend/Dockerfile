# ============================================================================
# EFVM360 Backend — Multi-Stage Production Dockerfile
# ============================================================================

# ── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests and install ALL dependencies (including devDeps for build)
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────────────────
FROM node:20-alpine AS production

# Metadata labels
LABEL maintainer="EFVM360 Team <devops@efvm360.com.br>"
LABEL version="1.0.0"
LABEL description="EFVM360 Backend API - Gestao de Troca de Turno Ferroviaria"

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

# Copy package manifests and install production-only dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist

# Use non-root user for security
USER node

EXPOSE 3001

# Health check against the API health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/v1/health || exit 1

CMD ["node", "dist/server.js"]
