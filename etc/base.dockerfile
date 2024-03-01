FROM node:20.11.0-slim@sha256:ecc9a2581f8588014a49a523a9ed146d27963f6d988d11bd16bbdcb3598f5f98 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.11.0-slim@sha256:ecc9a2581f8588014a49a523a9ed146d27963f6d988d11bd16bbdcb3598f5f98

ENTRYPOINT ["node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
