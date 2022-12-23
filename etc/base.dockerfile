FROM node:18-slim as builder

WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn --prod \
  && rm package.json yarn.lock

FROM powerman/dockerize:0.17.0 AS dockerize

FROM node:18-slim

COPY --from=dockerize /usr/local/bin/dockerize /usr/bin/dockerize

COPY --from=builder /usr/src/app/ /usr/src/app

ENV NODE_ENV=production
