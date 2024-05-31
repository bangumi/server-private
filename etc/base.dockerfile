FROM node:20.14.0-slim@sha256:a16301294ba66d2ad22d3beded4a52720f96ab208c1db0973c034d0127a4ccb0 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.14.0-slim@sha256:a16301294ba66d2ad22d3beded4a52720f96ab208c1db0973c034d0127a4ccb0

ENTRYPOINT ["node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
