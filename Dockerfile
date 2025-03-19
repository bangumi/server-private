FROM node:22.14.0-slim@sha256:bac8ff0b5302b06924a5e288fb4ceecef9c8bb0bb92515985d2efdc3a2447052 AS base

WORKDIR /app

# build dist/index.mjs
FROM base AS builder

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

RUN npm i -g corepack &&\
  corepack enable &&\
  corepack prepare --activate &&\
  pnpm install --frozen-lockfile

COPY . ./

RUN pnpm run build

FROM base AS prod-deps

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches/

RUN npm i -g corepack &&\
  corepack enable &&\
  corepack prepare --activate &&\
  npm pkg delete scripts.prepare &&\
  pnpm install --prod --frozen-lockfile

FROM gcr.io/distroless/nodejs22-debian12@sha256:881157f8399d3ab71c54068f148c25296f7f9bee6d36279febad5a6f46f41c2b

WORKDIR /app

ENTRYPOINT ["/nodejs/bin/node", "--enable-source-maps"]

ENV NODE_ENV=production

COPY --from=prod-deps /app/ /app/

ARG ARG_REF
ENV REF=$ARG_REF

COPY --from=builder /app/dist /app/dist
COPY . ./
