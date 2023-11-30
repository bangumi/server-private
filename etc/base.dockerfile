FROM node:20.9.0-slim@sha256:d272d96f3ad3a4e5bb2b6c36ea7427b4e83d1b23fb24b9df8b71d01aa59951b1 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.9.0-slim@sha256:d272d96f3ad3a4e5bb2b6c36ea7427b4e83d1b23fb24b9df8b71d01aa59951b1

ENTRYPOINT ["node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
