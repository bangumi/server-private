FROM node:18-slim@sha256:b175cd7f3358c399f7bcee9b1032b86b71b1afa4cfb4dd0db55d66f871475a3e as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM gcr.io/distroless/nodejs18-debian11:latest@sha256:c73d0509171d06c166a5e4ffb0b6a547623e5666f2764651f7dff7a3a97f2678

ENTRYPOINT ["/nodejs/bin/node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
