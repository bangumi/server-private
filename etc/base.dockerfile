FROM node:20.11.1-slim@sha256:474988d2fa8ad6321db19dc941af70202b163fca06a6b4e7f56067eda0c72eb9 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.11.1-slim@sha256:474988d2fa8ad6321db19dc941af70202b163fca06a6b4e7f56067eda0c72eb9

ENTRYPOINT ["node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
