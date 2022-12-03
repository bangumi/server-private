FROM node:lts-slim as builder

WORKDIR /usr/src/app

COPY . ./

RUN yarn

ENV NODE_ENV=production

ENTRYPOINT [ "node", "--loader=ts-node/esm", "--experimental-specifier-resolution=node", "--enable-source-maps", "lib/main.ts" ]
