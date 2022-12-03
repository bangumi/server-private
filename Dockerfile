FROM node:19-slim as builder

WORKDIR /usr/src/app

COPY . ./

# generate prisma client

RUN yarn &&\
    rm node_modules -rf &&\
    yarn --prod

##############

FROM node:19-slim

WORKDIR /usr/src/app
ENV NODE_ENV=production
ENTRYPOINT [ "node", "--loader=ts-node/esm", "--experimental-specifier-resolution=node", "--enable-source-maps", "lib/main.ts" ]

COPY --from=builder /usr/src/app/ ./


