FROM node:20.18.0-slim@sha256:967bab29ecde5d59a6dd781054bf9021eee8116068e1f5cb139750b6bc6a75e9 AS base

WORKDIR /app

# build dist/index.mjs
FROM base AS builder

COPY . ./

RUN corepack enable && corepack prepare --activate \
  && pnpm install --frozen-lockfile \
  && pnpm run build

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
