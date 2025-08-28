const fs = require("fs");
const path = require("path");
const pino = require("pino");

// Create logs directory if it doesn't exist
const logsDir = "./logs";
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || "info";

// Set up multi-stream logging (file + console)
const streams = [
  {
    level: logLevel,
    stream: pino.destination(path.join(logsDir, "logging.log")),
  },
  {
    level: logLevel,
    stream: pino.transport({
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
      },
    }),
  },
];

const logger = pino(
  {
    level: logLevel,
  },
  pino.multistream(streams),
);

module.exports = logger;
