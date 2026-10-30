#!/bin/sh
set -e

# Start TanStack Start / Nitro node server on port 3000
PORT=3000 NITRO_PORT=3000 node .output/server/index.mjs &

# Start Nginx in foreground
nginx -g "daemon off;"

