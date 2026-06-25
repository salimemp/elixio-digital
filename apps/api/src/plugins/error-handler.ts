import { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

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

    const statusCode = error.statusCode ?? 500;

    reply.status(statusCode).send({
      error: {
        code: error.code ?? "INTERNAL_ERROR",
        message: error.message || "Internal server error",
      },
    });
  });
}
