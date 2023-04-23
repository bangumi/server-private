FROM node:18-slim as builder

WORKDIR /app

COPY package.json .yarnrc.yml yarn.lock ./
COPY .yarn/ ./.yarn/

ENV NODE_ENV=production

RUN ls . -ahr &&\
    npm pkg delete scripts.prepare &&\
    yarn workspaces focus --production app &&\
    rm -rf package.json yarn.lock .yarnrc.yml .yarn

FROM gcr.io/distroless/nodejs18-debian11:latest

ENTRYPOINT ["/nodejs/bin/node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
