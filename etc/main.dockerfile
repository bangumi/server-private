FROM base-image

WORKDIR /usr/src/app

ENTRYPOINT [ "node", "--no-warnings", "--loader=ts-node/esm/transpile-only", "--experimental-specifier-resolution=node", "--enable-source-maps", "./lib/main.ts" ]

COPY . ./
