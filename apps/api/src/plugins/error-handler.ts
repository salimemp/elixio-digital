import { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import prismaPkg from "@prisma/client";

// Prisma client is CJS — default import + destructure works across
// ESM/CJS interop boundaries in Node 22+.
const { Prisma } = prismaPkg;

export async function registerErrorHandler(app: FastifyInstance): Promise<void> {
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          details: error.issues.map((issue) => issue.message),
        },
      });
      return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        reply.status(409).send({
          error: { code: "CONFLICT", message: "Resource already exists" },
        });
        return;
      }

      if (error.code === "P2025") {
        reply.status(404).send({
          error: { code: "NOT_FOUND", message: "Resource not found" },
        });
        return;
      }

      reply.status(500).send({
        error: { code: "DATABASE_ERROR", message: "Database error" },
      });
      return;
    }

    if (
      error.code === "FST_JWT_NO_AUTHORIZATION_IN_COOKIE" ||
      error.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER" ||
      error.code === "FST_JWT_AUTHORIZATION_TOKEN_INVALID"
    ) {
      reply.status(401).send({
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      });
      return;
    }

    // Rate limit errors thrown by @fastify/rate-limit come through
    // here with statusCode 429 but the plugin's `errorResponseBuilder`
    // doesn't always bypass setErrorHandler in v9. Detect by:
    //   - status code 429 (set by the plugin),
    //   - FST_ERR_RATE_LIMIT* code prefix (plugin-thrown error),
    //   - the `error.error.code === "RATE_LIMITED"` shape (when the
    //     plugin wraps our errorResponseBuilder output in {error: ...}).
    //
    // The third pattern was the actual production shape discovered
    // via debug logging (see git log "debug(api): log rate-limit
    // error shape to find the actual fields"). The error object
    // literally has a single key, "error", whose value is the
    // builder's return payload — so all the standard FastifyError
    // fields (code, statusCode, name) are undefined.
    const errWrapper = (error as unknown as { error?: { code?: string; message?: string } });
    if (
      error.statusCode === 429 ||
      (typeof error.code === "string" && error.code.startsWith("FST_ERR_RATE_LIMIT")) ||
      error.code === "RATE_LIMITED" ||
      errWrapper.error?.code === "RATE_LIMITED"
    ) {
      reply.status(429).send({
        error: {
          code: "RATE_LIMITED",
          message:
            errWrapper.error?.message ||
            (error.message as string) ||
            "Too many requests. Please slow down.",
        },
      });
      return;
    }

    const statusCode = error.statusCode ?? 500;

    reply.status(statusCode).send({
      error: {
        code: error.code ?? "INTERNAL_ERROR",
        message: error.message || "Internal server error",
      },
    });
  });
}
