FROM node:18-slim as builder

WORKDIR /app

COPY package.json .yarnrc.yml ./
COPY .yarn/ ./.yarn/

ENV NODE_ENV=production

RUN ls . -ahr &&\
    npm pkg delete scripts.prepare &&\
    yarn --immutable --prod &&\
    rm -rf package.json .yarn .yarnrc.yml

FROM gcr.io/distroless/nodejs18-debian11:latest

ENTRYPOINT ["/nodejs/bin/node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
