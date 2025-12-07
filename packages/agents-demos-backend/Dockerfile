# Multi-stage Dockerfile for the agents-demos-backend service
# - Builds the monorepo with pnpm in a builder stage
# - Produces a small production image that runs the compiled JS

# Builder stage
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Enable corepack and pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy the full repo (required for workspace-based installs)
COPY . .

# Install workspace deps (use frozen lockfile when available) and build only the backend
RUN pnpm -w install --frozen-lockfile
RUN pnpm -w --filter @daia/agents-demos-backend run build

# Production stage
FROM node:20-alpine AS runtime
WORKDIR /usr/src/app

# Enable pnpm in the runtime so we can install production deps scoped to the package
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manifest and built files for the backend package
COPY --from=builder /usr/src/app/packages/agents-demos-backend/package.json ./package.json
COPY --from=builder /usr/src/app/packages/agents-demos-backend/dist ./dist

# Install only production deps for the backend package
RUN pnpm -w --filter @daia/agents-demos-backend install --prod --frozen-lockfile

# Runtime environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the server
CMD ["node", "dist/index.js"]
