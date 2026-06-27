import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import jwt from "@fastify/jwt";
import { prisma } from "../lib/prisma.js";

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * Require the authenticated user to be a creator. Strict: also checks
     * the DB row's `isCreator` flag (defense in depth — JWT claims can
     * be stale if role was changed after the token was issued).
     * Admins always pass.
     */
    requireCreator: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * Require the authenticated user to be a buyer (or admin). Strict:
     * DB-row check, not just JWT flag. Use this on every /buyer/* route
     * so creators can't accidentally hit purchase endpoints using
     * stale creator-role tokens.
     */
    requireBuyer: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /**
     * Require the authenticated user to be an admin.
     */
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      userId: string;
      email: string;
      role: "buyer" | "creator" | "admin";
      isCreator: boolean;
      isAdmin: boolean;
    };
    user: {
      userId: string;
      email: string;
      role: "buyer" | "creator" | "admin";
      isCreator: boolean;
      isAdmin: boolean;
    };
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
      if (!request.user) {
        reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
        return;
      }
      if (request.user.isAdmin) return; // admins always pass
      // Strict: re-check the DB. JWT claims can be stale.
      const u = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: { isCreator: true, role: true },
      });
      if (!u || (u.role !== "admin" && !u.isCreator)) {
        reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Creator access required", role: request.user.role },
        });
      }
    }
  );

  app.decorate(
    "requireBuyer",
    async function requireBuyer(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      if (!request.user) {
        reply.status(401).send({ error: { code: "UNAUTHORIZED", message: "Authentication required" } });
        return;
      }
      if (request.user.isAdmin) return;
      // Strict: re-check the DB row.
      const u = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: { isBuyer: true, role: true },
      });
      if (!u || (u.role !== "admin" && !u.isBuyer)) {
        reply.status(403).send({
          error: { code: "FORBIDDEN", message: "Buyer access required", role: request.user.role },
        });
      }
    }
  );

  app.decorate(
    "requireAdmin",
    async function requireAdmin(
      request: FastifyRequest,
      reply: FastifyReply
    ): Promise<void> {
      if (!request.user?.isAdmin) {
        reply.status(403).send({ error: { code: "FORBIDDEN", message: "Admin access required" } });
      }
    }
  );
}
