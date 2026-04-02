FROM node:24.14.1-slim@sha256:06e5c9f86bfa0aaa7163cf37a5eaa8805f16b9acb48e3f85645b09d459fc2a9f AS base

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

FROM gcr.io/distroless/nodejs24-debian13@sha256:ea392bfe90af3b558c7b924647a403c4ac37c7e8e9917a86d0830d99732315e2

WORKDIR /app

ENTRYPOINT ["/nodejs/bin/node", "--enable-source-maps"]

ENV NODE_ENV=production

COPY --from=temp /app/ /app/

ARG ARG_REF
ENV REF=$ARG_REF
