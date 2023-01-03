FROM base-image

ARG ARG_REF=""

ENV REF=$ARG_REF

ENTRYPOINT [ "node", "--no-warnings", "--loader=@esbuild-kit/esm-loader", "--enable-source-maps", "./lib/main.ts" ]

COPY . ./
