FROM node:18-slim@sha256:77618f025144304c1e678fe27b3d67072da8ace6f0d99339b50c545d532f4475 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM gcr.io/distroless/nodejs18-debian11:latest@sha256:1d068dbc7a400b506c96af7799ea5eac2abbf695c7142c0695c4b054c144abfb

ENTRYPOINT ["/nodejs/bin/node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
