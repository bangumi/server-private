FROM node:18-slim as builder

WORKDIR /app

COPY package.json package-lock.json ./

ENV NODE_ENV=production

RUN npm pkg delete scripts.prepare && npm ci && rm package.json package-lock.json

FROM node:18-slim

WORKDIR /app

ENV NODE_ENV=production

ENTRYPOINT [ "node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./lib/main.ts" ]

COPY --from=builder /app/ /app
