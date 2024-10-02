FROM node:20.17.0-slim@sha256:2394e403d45a644e41ac2a15b6f843a7d4a99ad24be48c27982c5fdc61a1ef17 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.17.0-slim@sha256:2394e403d45a644e41ac2a15b6f843a7d4a99ad24be48c27982c5fdc61a1ef17

ENTRYPOINT ["node", "--enable-source-maps", "./dist/index.mjs"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
