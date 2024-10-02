FROM node:20.17.0-slim@sha256:2394e403d45a644e41ac2a15b6f843a7d4a99ad24be48c27982c5fdc61a1ef17 as builder

WORKDIR /app

COPY . ./

RUN corepack enable && corepack prepare --activate \
  && pnpm install \
  && pnpm run build

FROM base-image

ARG ARG_REF

ENV REF=$ARG_REF

COPY . ./

COPY --from=builder /app/dist ./dist
