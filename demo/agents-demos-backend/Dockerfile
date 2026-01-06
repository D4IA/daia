# Multi-stage Dockerfile for agents-demos-backend
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies for native modules (if any)
RUN apk add --no-cache python3 make g++

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Copy entire monorepo (required for workspace builds)
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build all packages using turbo
RUN pnpm run build

# Production stage
FROM node:22 AS runtime

WORKDIR /usr/src/app

# Copy built package from builder
COPY --from=builder /usr/src/app/demo/agents-demos-backend .
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Runtime configuration
ENV NODE_ENV=production
ENV PORT=3000

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "dist/index.js"]
