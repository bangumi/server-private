FROM node:24.19.0-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS base

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

FROM gcr.io/distroless/nodejs24-debian13@sha256:2e3b3a96d1d7286c3e4727f9c84b4dc32b6b33e7d7d4425c5a5c8186ad85fa93

WORKDIR /app

ENTRYPOINT ["/nodejs/bin/node", "--enable-source-maps"]

ENV NODE_ENV=production

COPY --from=temp /app/ /app/

ARG ARG_REF
ENV REF=$ARG_REF
