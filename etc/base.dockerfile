FROM node:18-slim@sha256:a0cca98f2896135d4c0386922211c1f90f98f27a58b8f2c07850d0fbe1c2104e as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM gcr.io/distroless/nodejs18-debian11:latest@sha256:117e714f608555028a18c8162db6246557ec667159d18714a4dd7a9ee5948be2

ENTRYPOINT ["/nodejs/bin/node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
