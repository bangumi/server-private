FROM node:20.16.0-slim@sha256:2d4585684de1a8483b91ed507cefb6270e8e0f3feff1a2d586e95d3e13c1af39 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.16.0-slim@sha256:2d4585684de1a8483b91ed507cefb6270e8e0f3feff1a2d586e95d3e13c1af39

ENTRYPOINT ["node", "--no-warnings", "--import=tsx/esm", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
