FROM node:22.14.0-slim@sha256:bac8ff0b5302b06924a5e288fb4ceecef9c8bb0bb92515985d2efdc3a2447052 AS base

WORKDIR /app

FROM base AS prod-deps

COPY . ./

RUN npm i -g corepack &&\
  corepack enable &&\
  corepack prepare --activate &&\
  npm pkg delete scripts.prepare &&\
  pnpm install --frozen-lockfile &&\
  pnpm run build &&\
  pnpm install --prod --frozen-lockfile

FROM gcr.io/distroless/nodejs22-debian12@sha256:b0df7917d86c254e76d0855775679d9ee4ec7c307503259d92f431b618393a4d

WORKDIR /app

ENTRYPOINT ["/nodejs/bin/node", "--enable-source-maps"]

ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules /app/dist /app/

ARG ARG_REF
ENV REF=$ARG_REF
