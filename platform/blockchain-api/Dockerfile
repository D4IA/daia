# Single-stage Dockerfile for blockchain-api
FROM node:22-alpine

WORKDIR /usr/src/app

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Enable corepack and prepare pnpm
RUN corepack enable
ENV COREPACK_ENABLE_STRICT=0

# Copy entire monorepo (required for workspace builds)
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build all packages using turbo
RUN pnpm run build

# Set working directory to the blockchain-api package
WORKDIR /usr/src/app/platform/blockchain-api

# Runtime configuration
ENV NODE_ENV=production
ENV API_PORT=3000

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "dist/index.js"]
