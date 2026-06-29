/**
 * Lightweight structured logger. Compatible with Fastify's pino-style
 * call site (object-first, message-second).
 *
 *   logger.info({ userId: "..." }, "user logged in");
 *   logger.warn({ err }, "rate limit hit");
 *
 * Output goes to stdout in dev. In production the platform (Railway)
 * captures stdout and forwards to a log aggregator.
 */

type LogObj = Record<string, unknown> | unknown;

function format(obj: LogObj, msg: string): string {
  const ts = new Date().toISOString();
  const objStr = obj && typeof obj === "object" ? " " + JSON.stringify(obj) : "";
  return `${ts} ${msg}${objStr}`;
}

export const logger = {
  info(obj: LogObj, msg: string): void {
    // eslint-disable-next-line no-console
    console.log(format(obj, msg));
  },
  warn(obj: LogObj, msg: string): void {
    // eslint-disable-next-line no-console
    console.warn(format(obj, msg));
  },
  error(obj: LogObj, msg: string): void {
    // eslint-disable-next-line no-console
    console.error(format(obj, msg));
  },
  debug(obj: LogObj, msg: string): void {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(format(obj, msg));
    }
  },
};