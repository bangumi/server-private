FROM node:20.6.1-slim@sha256:2dab2d0e8813ee1601f8d25a8e4aa5530ffc4d0cc16600ec4fd080263b5b1ccd as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.6.1-slim@sha256:2dab2d0e8813ee1601f8d25a8e4aa5530ffc4d0cc16600ec4fd080263b5b1ccd

ENTRYPOINT ["node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
