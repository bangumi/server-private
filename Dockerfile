FROM node:24.18.0-slim@sha256:b31e7a42fdf8b8aa5f5ed477c72d694301273f1069c5a2f71d53c6482e99a2fc AS base

WORKDIR /app

FROM base AS build

COPY . ./

RUN npm i -g corepack &&\
  corepack enable &&\
  corepack prepare --activate &&\
  npm pkg delete scripts.prepare &&\
  pnpm install --frozen-lockfile &&\
  pnpm run build &&\
  pnpm install --prod --frozen-lockfile


FROM base AS temp

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/dist /app/dist
COPY . ./

FROM gcr.io/distroless/nodejs24-debian13@sha256:ef5f3caf80da1630edd1a4df7b307a8f7d4553f8eec1dd29852b76e793593903

WORKDIR /app

ENTRYPOINT ["/nodejs/bin/node", "--enable-source-maps"]

ENV NODE_ENV=production

COPY --from=temp /app/ /app/

ARG ARG_REF
ENV REF=$ARG_REF
