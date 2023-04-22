FROM node:18-slim as builder

WORKDIR /app

COPY package.json pnpm-lock.yaml .npmrc ./

ENV NODE_ENV=production

RUN npm i -g pnpm \
  && npm pkg delete scripts.prepare \
  && pnpm fetch --prod \
  && pnpm install -r --offline --prod \
  && rm package.json pnpm-lock.yaml .npmrc

FROM gcr.io/distroless/nodejs18-debian11:latest

ENTRYPOINT ["/nodejs/bin/node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./bin/main.ts"]

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/ /app
