FROM base-image

WORKDIR /usr/src/app

ARG ARG_REF=""

ENV REF=$ARG_REF

ENTRYPOINT [ "node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./lib/main.ts" ]

COPY . ./
