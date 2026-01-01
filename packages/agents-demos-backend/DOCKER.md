Quick Docker usage for the backend demo

Build the image (run from repo root):

```bash
# From repo root (important for workspace install to work)
docker build -t agents-demos-backend:latest -f packages/agents-demos-backend/Dockerfile .
```

Run the container:

```bash
docker run --rm -p 3000:3000 \
  -e OPENAI_API_KEY="sk-..." \
  -e PROXY_API_KEY="optional-secret" \
  agents-demos-backend:latest
```

Notes:
- The Dockerfile expects PNPM-managed workspaces (the monorepo) since packages use `workspace:*` deps.
- For local testing you can omit `PROXY_API_KEY` to allow requests without the API key; set it in prod to protect the proxy.
- If your CI builds images in subdirectories, ensure the build context includes the repository root so pnpm workspace install works.
- To minimize image size for production, consider additional tuning (smaller base image, explicit dependency filtering, and only copying required files).

---

## Automated build scripts ⚙️

Two helper scripts are included in `packages/agents-demos-backend/scripts`:

- `get-version.sh` — prints the `version` from `packages/agents-demos-backend/package.json` using `jq`.
- `build.sh` — builds the Docker image and tags it using that version. The default image name is `agents-demos-backend:<version>` but you can override it with the `IMAGE_NAME` env var. Set `PUSH=true` to push the image after building.

Usage:

```bash
# Make scripts executable (once)
chmod +x packages/agents-demos-backend/scripts/*.sh

# Build locally (from repo root or anywhere)
packages/agents-demos-backend/scripts/build.sh

# Override image name and push to registry
IMAGE_NAME="ghcr.io/your-org/agents-demos-backend" PUSH=true packages/agents-demos-backend/scripts/build.sh
```

Notes:
- These scripts require `jq` and `docker` to be installed on the machine running them.
- The `build.sh` script uses the repository root as the Docker build context (so workspace installs work correctly).

---

## Docker Compose example

A small `docker-compose.yml` is included at `packages/agents-demos-backend/docker-compose.yml` that builds the image from the repository root and exposes port `3000`.

Usage (from `packages/agents-demos-backend`):

```bash
# Create a .env next to docker-compose.yml with your keys, or export env vars
# Example .env:
# OPENAI_API_KEY=sk-...
# PROXY_API_KEY=optional-secret

# Build and run in one command
docker compose up --build

# Or build only then run
docker compose build && docker compose up
```

Notes:
- The compose file uses `context: ..` (repo root) so pnpm workspace installs work during the build.
- The image is tagged `agents-demos-backend:local` by default; change the `image` field in the compose file or use `docker compose build --no-cache` and `docker tag` if desired.
