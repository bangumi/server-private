FROM base-image

ARG ARG_REF=""

ENV REF=$ARG_REF

COPY . ./
