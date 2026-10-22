# Multi-stage Dockerfile for Backend (Node.js + TypeScript)
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build
# Copy sql files to dist/db
RUN mkdir -p dist/db && cp src/db/*.sql dist/db/

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Hardening: Run as non-root user (node)
ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Create logs directory and assign permissions to non-root user
RUN mkdir -p /app/logs && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "dist/index.js"]
