import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import jwt from "@fastify/jwt";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireCreator: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string; email: string; isCreator: boolean; isAdmin: boolean };
    user: { userId: string; email: string; isCreator: boolean; isAdmin: boolean };
  }
}

interface RegisterAuthOptions {
  secret: string;
}

export async function registerAuth(
  app: FastifyInstance,
  options: RegisterAuthOptions
): Promise<void> {
  await app.register(jwt, { secret: options.secret });

  app.decorate(
    "authenticate",
    async function authenticate(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err as Error);
      }
    }
  );

  app.decorate(
    "requireCreator",
    async function requireCreator(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      if (!request.user.isCreator && !request.user.isAdmin) {
        reply.status(403).send({ error: { code: "FORBIDDEN", message: "Creator access required" } });
      }
    }
  );

  app.decorate(
    "requireAdmin",
    async function requireAdmin(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      if (!request.user.isAdmin) {
        reply.status(403).send({ error: { code: "FORBIDDEN", message: "Admin access required" } });
      }
    }
  );
}
