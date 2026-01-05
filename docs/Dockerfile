# Stage 1: Build the Hugo site
FROM alpine:latest AS builder

# Install Go, build dependencies and Node.js
RUN apk add --no-cache \
    go \
    git \
    gcc \
    g++ \
    musl-dev \
    ca-certificates \
    nodejs \
    npm

# Install Hugo from source with extended features
ENV CGO_ENABLED=1
ENV GOPATH=/go
ENV PATH=$PATH:/go/bin
RUN go install -tags extended,withdeploy github.com/gohugoio/hugo@latest && \
    hugo version

# Set working directory
WORKDIR /app

# Copy package files and configuration for dependency installation
COPY docs/package.json docs/pnpm-lock.yaml* ./docs/
COPY docs/.npmrc ./docs/

# Install pnpm and dependencies (fresh install without existing node_modules)

RUN rm -rf docs/node_modules

RUN npm install -g pnpm@10.0.0 && \
    cd docs && \
    pnpm install --frozen-lockfile --ignore-workspace

# Copy the entire docs directory (excluding node_modules via .dockerignore)
COPY docs ./docs

# Build the Hugo site
WORKDIR /app/docs
RUN hugo --minify --gc

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy the built site from the builder stage
COPY --from=builder /app/docs/public /usr/share/nginx/html

# Copy nginx configuration (optional, using default for now)
# COPY docs/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
