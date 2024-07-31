FROM node:20.15.0-slim@sha256:b5e567dc37677a1485cec21e2f0c0df517c7afe40c1ebc28248c41520c77b3d0 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.15.0-slim@sha256:b5e567dc37677a1485cec21e2f0c0df517c7afe40c1ebc28248c41520c77b3d0

ENTRYPOINT ["node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
