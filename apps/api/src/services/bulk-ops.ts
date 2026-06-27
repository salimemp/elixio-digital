import { prisma } from "../lib/prisma.js";

export type BulkOperationKind =
  | "price_update"
  | "tag_add"
  | "tag_remove"
  | "publish"
  | "archive"
  | "delete"
  | "category_change";

export interface BulkOpOptions {
  creatorId: string;
  assetIds: string[];
  kind: BulkOperationKind;
  payload: Record<string, unknown>;
}

/**
 * Verify the creator owns every asset they want to bulk-act on.
 * Returns the owned assets, throws on first unowned ID.
 */
async function authorizeAssets(
  creatorId: string,
  assetIds: string[]
): Promise<void> {
  const owned = await prisma.asset.findMany({
    where: { creatorId, id: { in: assetIds } },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((a) => a.id));
  const unowned = assetIds.filter((id) => !ownedSet.has(id));
  if (unowned.length > 0) {
    throw new Error(`Not authorized for asset(s): ${unowned.join(", ")}`);
  }
}

export interface BulkOpResult {
  affected: number;
  operationId: string;
  beforeSnapshot: Record<string, unknown>[];
}

/**
 * Run a bulk operation. Snapshots the before-state for undo,
 * performs the change, persists the audit row.
 */
export async function runBulkOp(opts: BulkOpOptions): Promise<BulkOpResult> {
  if (opts.assetIds.length === 0) {
    throw new Error("No asset IDs provided");
  }
  if (opts.assetIds.length > 500) {
    throw new Error("Bulk operations limited to 500 assets per call");
  }
  await authorizeAssets(opts.creatorId, opts.assetIds);

  // Snapshot the before state for undo
  const beforeAssets = await prisma.asset.findMany({
    where: { id: { in: opts.assetIds } },
    include: { tags: { include: { tag: true } } },
  });
  const beforeSnapshot = beforeAssets.map((a) => ({
    id: a.id,
    title: a.title,
    priceCents: a.priceCents,
    status: a.status,
    categoryId: a.categoryId,
    tags: a.tags.map((t) => t.tag.name),
  }));

  let affected = 0;

  switch (opts.kind) {
    case "price_update": {
      const op = opts.payload as { mode: "set" | "increase_pct" | "decrease_pct"; value: number };
      if (op.mode === "set") {
        const r = await prisma.asset.updateMany({
          where: { id: { in: opts.assetIds }, creatorId: opts.creatorId },
          data: { priceCents: Math.max(0, Math.round(op.value)) },
        });
        affected = r.count;
      } else {
        // Percentage mode
        for (const a of beforeAssets) {
          let next = a.priceCents;
          if (op.mode === "increase_pct") next = next * (1 + op.value / 100);
          else if (op.mode === "decrease_pct") next = next * (1 - op.value / 100);
          next = Math.max(99, Math.round(next));
          await prisma.asset.update({
            where: { id: a.id },
            data: { priceCents: next },
          });
          affected++;
        }
      }
      break;
    }

    case "publish":
    case "archive": {
      const newStatus = opts.kind === "publish" ? "published" : "archived";
      const r = await prisma.asset.updateMany({
        where: { id: { in: opts.assetIds }, creatorId: opts.creatorId },
        data: { status: newStatus },
      });
      affected = r.count;
      break;
    }

    case "delete": {
      const r = await prisma.asset.deleteMany({
        where: { id: { in: opts.assetIds }, creatorId: opts.creatorId },
      });
      affected = r.count;
      break;
    }

    case "category_change": {
      const categoryId = String(opts.payload.categoryId);
      const r = await prisma.asset.updateMany({
        where: { id: { in: opts.assetIds }, creatorId: opts.creatorId },
        data: { categoryId },
      });
      affected = r.count;
      break;
    }

    case "tag_add":
    case "tag_remove": {
      const tagSlugs = (opts.payload.tags as string[]) ?? [];
      // Find-or-create the tags
      const tagRecords = await Promise.all(
        tagSlugs.map(async (slug) => {
          return prisma.tag.upsert({
            where: { name: slug },
            create: { name: slug },
            update: {},
          });
        })
      );
      const tagIds = tagRecords.map((t) => t.id);

      if (opts.kind === "tag_add") {
        for (const assetId of opts.assetIds) {
          for (const tagId of tagIds) {
            await prisma.assetTag.upsert({
              where: { assetId_tagId: { assetId, tagId } },
              create: { assetId, tagId },
              update: {},
            });
            affected++;
          }
        }
      } else {
        const r = await prisma.assetTag.deleteMany({
          where: { assetId: { in: opts.assetIds }, tagId: { in: tagIds } },
        });
        affected = r.count;
      }
      break;
    }

    default:
      throw new Error(`Unknown bulk operation kind: ${opts.kind}`);
  }

  // Audit log
  const op = await prisma.bulkOperation.create({
    data: {
      creatorId: opts.creatorId,
      kind: opts.kind,
      affectedIds: opts.assetIds,
      beforeJson: beforeSnapshot as object,
      afterJson: { affected, kind: opts.kind, payload: opts.payload } as object,
    },
  });

  return { affected, operationId: op.id, beforeSnapshot };
}

/**
 * Roll back a bulk operation using the saved before-snapshot.
 * Limited support — works fully for price_update, publish, archive,
 * category_change. For tag_add/tag_remove partial. delete is irreversible.
 */
export async function rollbackBulkOp(
  creatorId: string,
  operationId: string
): Promise<{ rolledBack: boolean; reason?: string }> {
  const op = await prisma.bulkOperation.findFirst({
    where: { id: operationId, creatorId },
  });
  if (!op) return { rolledBack: false, reason: "Operation not found" };
  if (op.rolledBackAt) return { rolledBack: false, reason: "Already rolled back" };
  const before = op.beforeJson as Array<{
    id: string;
    priceCents: number;
    status: string;
    categoryId: string;
    tags: string[];
  }>;
  if (!before || before.length === 0) {
    return { rolledBack: false, reason: "No snapshot to restore" };
  }

  // Restore fields
  for (const snap of before) {
    await prisma.asset.update({
      where: { id: snap.id },
      data: {
        priceCents: snap.priceCents,
        status: snap.status as "draft" | "published" | "archived" | "rejected",
        categoryId: snap.categoryId,
      },
    });
  }

  await prisma.bulkOperation.update({
    where: { id: operationId },
    data: { rolledBackAt: new Date() },
  });

  return { rolledBack: true };
}