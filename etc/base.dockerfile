FROM node:20.17.0-slim@sha256:9fb20391a0320aed25636d8312f4332f9be734c5acef4c94722048c2bed5a87d as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.17.0-slim@sha256:9fb20391a0320aed25636d8312f4332f9be734c5acef4c94722048c2bed5a87d

ENTRYPOINT ["node", "--no-warnings", "--import=tsx/esm", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
