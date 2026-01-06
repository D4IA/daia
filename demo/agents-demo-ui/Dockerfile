# Multi-stage Dockerfile for UI using pnpm deploy
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

# Copy entire monorepo (required for workspace builds)
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build all packages using turbo
RUN pnpm run build

# Production stage with nginx
FROM nginx:alpine AS runtime

# Copy built static files from builder
COPY --from=builder /usr/src/app/demo/agents-demo-ui/dist /usr/share/nginx/html

# Copy and prepare entrypoint script
COPY --from=builder /usr/src/app/demo/agents-demo-ui/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create nginx configuration for SPA routing and config endpoint
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api/config { \
        add_header Content-Type application/json; \
        add_header Cache-Control "no-cache, no-store, must-revalidate"; \
        try_files /api/config =404; \
    } \
    location /robots.txt { \
        add_header Content-Type text/plain; \
        try_files /robots.txt =404; \
    } \
    location /health { \
        access_log off; \
        return 200 "healthy\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose HTTP port
EXPOSE 80

# Environment variable for runtime configuration
ENV OPENAI_API_KEY=""

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx with entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]