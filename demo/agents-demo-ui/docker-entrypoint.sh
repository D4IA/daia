#!/bin/sh
set -e

# Create api directory and generate runtime configuration file
mkdir -p /usr/share/nginx/html/api
cat > /usr/share/nginx/html/api/config <<EOF
{
  "OPENAI_API_KEY": "${OPENAI_API_KEY:-}"
}
EOF

# Start nginx
exec nginx -g "daemon off;"
