FROM node:20.15.0-slim@sha256:cf8ed52d8dc93835e5f4cda89aaa63a6157babe7dffb19227e97a8989a6269ed as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.15.0-slim@sha256:cf8ed52d8dc93835e5f4cda89aaa63a6157babe7dffb19227e97a8989a6269ed

ENTRYPOINT ["node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
