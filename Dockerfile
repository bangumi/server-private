FROM node:22.11.0-slim@sha256:f73e9c70d4279d5e7b7cc1fe307c5de18b61089ffa2235230408dfb14e2f09a0 AS base

WORKDIR /app

# build dist/index.mjs
FROM base AS builder

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

RUN corepack enable && corepack prepare --activate \
  && pnpm install --frozen-lockfile

COPY . ./

RUN pnpm run build

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

RUN corepack enable && corepack prepare --activate \
  && npm pkg delete scripts.prepare \
  && pnpm install --prod --frozen-lockfile

FROM base AS final

ENTRYPOINT ["node", "--enable-source-maps", "./dist/index.mjs"]

ENV NODE_ENV=production

COPY --from=prod-deps /app/ /app/

ARG ARG_REF
ENV REF=$ARG_REF

COPY --from=builder /app/dist /app/dist
COPY . ./
