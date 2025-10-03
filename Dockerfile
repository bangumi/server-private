FROM node:22.19.0-slim@sha256:0ae9e80c8c7e7a8fea5bc8e8762e4fd09a7a68c251abf8cf44ea0863efda2bc5 AS base

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

FROM gcr.io/distroless/nodejs22-debian12@sha256:4457cf5f47fa4bc2d3a3733feb08180bdbd5fd0ee176da532984ab2444b76fcc

WORKDIR /app

ENTRYPOINT ["/nodejs/bin/node", "--enable-source-maps"]

ENV NODE_ENV=production

COPY --from=temp /app/ /app/

ARG ARG_REF
ENV REF=$ARG_REF
