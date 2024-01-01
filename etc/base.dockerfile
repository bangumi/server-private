FROM node:20.10.0-slim@sha256:5c714c3e90f66a2cbfa266b90a4d7adcd63453cd730aa2d13cba84b260bea2e6 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.10.0-slim@sha256:5c714c3e90f66a2cbfa266b90a4d7adcd63453cd730aa2d13cba84b260bea2e6

ENTRYPOINT ["node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
