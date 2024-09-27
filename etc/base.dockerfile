FROM node:20.17.0-slim@sha256:3ecb7d2cb78cf6684a80d625b0f258ab3e53c05e2c7bb3fdaa956943f9222963 as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

ENV NODE_ENV=production

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm -rf package.json pnpm-lock.yaml .npmrc patches

FROM node:20.17.0-slim@sha256:3ecb7d2cb78cf6684a80d625b0f258ab3e53c05e2c7bb3fdaa956943f9222963

ENTRYPOINT ["node", "--no-warnings", "--import=tsx/esm", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
