FROM node:18-slim as builder

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn --prod \
  && rm package.json yarn.lock

FROM node:18-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
