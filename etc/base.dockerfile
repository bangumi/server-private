FROM node:18-slim as builder

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn --prod \
  && rm package.json yarn.lock

FROM node:18-slim

COPY --from=builder /usr/src/app/ /usr/src/app

ENV NODE_ENV=production
