FROM node:20.17.0-slim@sha256:df85129996d6b7a4ec702ebf2142cfa683f28b1d33446faec12168d122d3410d as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.17.0-slim@sha256:df85129996d6b7a4ec702ebf2142cfa683f28b1d33446faec12168d122d3410d

ENTRYPOINT ["node", "--no-warnings", "--import=tsx/esm", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
