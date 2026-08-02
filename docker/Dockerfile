# Copyright (C) 2026 StoneDogCode L.L.C.
# SPDX-License-Identifier: AGPL-3.0-only
#
# The self-host image. One container, SQLite on a mounted volume, no external
# services — that constraint IS the product for this tier. The moment
# self-hosting needs Postgres plus Redis plus an SMTP relay, the audience it
# exists for stops installing it.
#
# Build multi-arch, because a meaningful share of self-hosters are on ARM boxes
# and Pis:
#   docker buildx build --platform linux/amd64,linux/arm64 -f docker/Dockerfile .

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /build

# Source first, then install.
#
# The usual trick is to copy manifests, `npm ci`, then copy source — so a
# source-only edit reuses the install layer. It does not work here:
# hopper-style's `prepare` script runs `panda codegen`, which needs its source,
# and `npm ci` runs prepare for every workspace. Installing with
# --ignore-scripts would skip it and leave hopper-style without the
# styled-system its own components import.
#
# So the layer cache is traded for a build that matches what runs locally. This
# image is built rarely; a confusing divergence between CI and a developer's
# machine would cost far more than the cache saves.
COPY . .
RUN npm ci

# `next build` needs the emitting packages compiled and Panda codegen run
# first. Both are wired into apps/web's prebuild, so this is one command.
RUN npm run build --workspace=@maximus/web

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# OPTIMA_DB_PATH is deliberately NOT set here, though the image used to set it.
#
# The app defaults to the same `/data/optima.sqlite`, so setting it changed
# nothing — except that it is *always defined*, which silently disabled the
# MAXIMUS_DB_PATH fallback (NEH-237): an upgrading self-hoster who had set the
# pre-rename variable would have had it ignored, and been handed an empty
# database beside their real one. Defaults belong in the app, where the
# fallback logic can see them.

# Never root. A compromised web process should not be able to rewrite its own
# application code — and `node` already exists in the base image.
RUN mkdir -p /data && chown -R node:node /data

# Next's `standalone` output traces exactly the files the server needs, so the
# runtime layer carries no node_modules install and no package manager.
COPY --from=builder --chown=node:node /build/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /build/apps/web/.next/static ./apps/web/.next/static

USER node
VOLUME ["/data"]
EXPOSE 3000

# The database lives on the volume. Without `-v`, it is written inside the
# container and vanishes on the next `docker run` — the app logs its path at
# startup so that loss is noticed immediately rather than later.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
