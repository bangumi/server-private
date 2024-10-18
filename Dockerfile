FROM node:20.18.0-slim@sha256:ec35a66c9a0a275b027debde05247c081f8b2f0c43d7399d3a6ad5660cee2f6a AS base

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
