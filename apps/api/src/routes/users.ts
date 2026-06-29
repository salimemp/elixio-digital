import { FastifyInstance } from "fastify";
import { z } from "zod";
import { idParamSchema, updateProfileSchema } from "@elixio/shared";
import * as userService from "../services/users.js";

const exportRequestSchema = z.object({}).strict();

const deleteAccountSchema = z.object({
  password: z.string().min(1).max(256),
  reason: z.string().max(500).optional(),
});

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get("/:id", async (request) => {
    const params = idParamSchema.parse(request.params);
    const user = await userService.getPublicProfile(params.id);
    return user;
  });

  app.patch("/me", { preHandler: [app.authenticate] }, async (request) => {
    const input = updateProfileSchema.parse(request.body);
    const user = await userService.updateProfile(request.user.userId, input);
    return user;
  });

  app.post("/me/become-creator", { preHandler: [app.authenticate] }, async (request) => {
    const user = await userService.becomeCreator(request.user.userId);
    return user;
  });

  /**
   * GDPR Art. 15 + CCPA Right to Know — synchronous data export.
   *
   * For >1MB responses we should switch to async (queue a job, email a
   * signed download link). For the current schema, <50KB total.
   */
  app.post(
    "/me/export",
    { preHandler: [app.authenticate] },
    async (request) => {
      exportRequestSchema.parse(request.body ?? {});
      const data = await userService.exportUserData(request.user.userId);
      return data;
    },
  );

  /**
   * GDPR Art. 17 + CCPA Right to Delete — soft-delete with 30-day grace.
   * Soft-delete means: PII anonymized, sessions revoked, OAuth unlinked,
   * MFA disabled, `deletedAt` set. Background job (Phase 2) hard-deletes
   * the anonymized row after 30 days; tax/financial records are kept
   * separately for 7-year retention.
   */
  app.post(
    "/me/delete",
    { preHandler: [app.authenticate] },
    async (request) => {
      const input = deleteAccountSchema.parse(request.body);
      const result = await userService.softDeleteAccount(
        request.user.userId,
        input.password,
        input.reason,
      );
      return result;
    },
  );
}
