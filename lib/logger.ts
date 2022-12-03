import * as stream from "stream";

import * as winston from "winston";

export const logger = winston.createLogger({
  level: "info",
});

const out = new stream.PassThrough();

out.pipe(process.stdout);

if (process.env.NODE_ENV === "production") {
  logger.add(
    new winston.transports.Stream({
      stream: out,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  );
} else {
  logger.add(
    new winston.transports.Stream({
      stream: out,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize({
          colors: {
            info: "blue",
            warn: "yellow",
            error: "red",
          },
        }),
        winston.format.simple(),
      ),
    }),
  );
}
