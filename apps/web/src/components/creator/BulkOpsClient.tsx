"use client";

import { useEffect, useState } from "react";
import { getAccessToken } from "@/lib/auth";
import { api } from "@/lib/api";

interface CreatorAsset {
  id: string;
  title: string;
  status: string;
  priceCents: number;
  categoryId: string;
}

interface BulkOpHistory {
  id: string;
  kind: string;
  affectedIds: string[];
  createdAt: string;
  rolledBackAt: string | null;
}

/**
 * /dashboard/bulk — bulk operations over the creator's assets.
 * Select assets → choose operation → preview → run.
 * Supports rollback for any non-delete operation.
 */
export function BulkOpsClient() {
  const [assets, setAssets] = useState<CreatorAsset[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [op, setOp] = useState<
    "price_update" | "publish" | "archive" | "tag_add" | "tag_remove" | "delete"
  >("price_update");
  const [payload, setPayload] = useState<{ value?: number; mode?: string; tags?: string }>({
    mode: "set",
    value: 0,
  });
  const [history, setHistory] = useState<BulkOpHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tok = getAccessToken();
    if (!tok) return;
    Promise.all([
      api<{ items: CreatorAsset[] }>("/assets?limit=100", { authToken: tok }),
      api<{ operations: BulkOpHistory[] }>("/creator/bulk/history", { authToken: tok }),
    ])
      .then(([a, h]) => {
        setAssets(a.items ?? []);
        setHistory(h.operations ?? []);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === assets.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assets.map((a) => a.id)));
    }
  }

  async function run() {
    const tok = getAccessToken();
    if (!tok) {
      setError("Sign in first");
      return;
    }
    if (selected.size === 0) {
      setError("Select at least one asset");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payloadObj: Record<string, unknown> = {};
      if (op === "price_update") {
        payloadObj.mode = payload.mode;
        payloadObj.value = Number(payload.value);
      } else if (op === "tag_add" || op === "tag_remove") {
        payloadObj.tags = (payload.tags ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
      const r = await api<{ affected: number; operationId: string }>("/creator/bulk", {
        method: "POST",
        body: {
          kind: op,
          assetIds: Array.from(selected),
          payload: payloadObj,
        },
        authToken: tok,
      });
      setResult(`✓ Updated ${r.affected} asset(s). Operation: ${r.operationId}`);
      // Refresh assets + history
      const [a, h] = await Promise.all([
        api<{ items: CreatorAsset[] }>("/assets?limit=100", { authToken: tok }),
        api<{ operations: BulkOpHistory[] }>("/creator/bulk/history", { authToken: tok }),
      ]);
      setAssets(a.items ?? []);
      setHistory(h.operations ?? []);
      setSelected(new Set());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function rollback(operationId: string) {
    const tok = getAccessToken();
    if (!tok) return;
    setError(null);
    try {
      await api(`/creator/bulk/${operationId}/rollback`, {
        method: "POST",
        authToken: tok,
      });
      // Refresh
      const [a, h] = await Promise.all([
        api<{ items: CreatorAsset[] }>("/assets?limit=100", { authToken: tok }),
        api<{ operations: BulkOpHistory[] }>("/creator/bulk/history", { authToken: tok }),
      ]);
      setAssets(a.items ?? []);
      setHistory(h.operations ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="gum-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Your assets</h2>
          <button onClick={selectAll} className="text-xs underline">
            {selected.size === assets.length ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-gum-black text-left">
                <th className="w-8"></th>
                <th>Title</th>
                <th>Status</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => (
                <tr
                  key={a.id}
                  className={`border-b border-gray-200 ${
                    selected.has(a.id) ? "bg-gum-yellow" : ""
                  }`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="py-2 font-bold">{a.title}</td>
                  <td>{a.status}</td>
                  <td>${(a.priceCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-600">
          {selected.size} selected
        </p>
      </div>

      <div className="gum-card">
        <h2 className="mb-3 text-lg font-bold">Operation</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            value={op}
            onChange={(e) => setOp(e.target.value as typeof op)}
            className="rounded-2xl border-2 border-gum-black bg-white p-2 text-sm"
          >
            <option value="price_update">Update price</option>
            <option value="publish">Publish</option>
            <option value="archive">Archive</option>
            <option value="tag_add">Add tags</option>
            <option value="tag_remove">Remove tags</option>
            <option value="delete">Delete (irreversible)</option>
          </select>

          {op === "price_update" && (
            <>
              <select
                value={payload.mode}
                onChange={(e) => setPayload({ ...payload, mode: e.target.value })}
                className="rounded-2xl border-2 border-gum-black bg-white p-2 text-sm"
              >
                <option value="set">Set to (cents)</option>
                <option value="increase_pct">Increase by (%)</option>
                <option value="decrease_pct">Decrease by (%)</option>
              </select>
              <input
                type="number"
                value={payload.value}
                onChange={(e) => setPayload({ ...payload, value: Number(e.target.value) })}
                placeholder={payload.mode === "set" ? "Price in cents" : "Percentage"}
                className="rounded-2xl border-2 border-gum-black bg-white p-2 text-sm"
              />
            </>
          )}

          {(op === "tag_add" || op === "tag_remove") && (
            <input
              value={payload.tags ?? ""}
              onChange={(e) => setPayload({ ...payload, tags: e.target.value })}
              placeholder="Tags (comma-separated, e.g. wedding, minimalist, canva)"
              className="rounded-2xl border-2 border-gum-black bg-white p-2 text-sm md:col-span-2"
            />
          )}
        </div>

        <button
          onClick={run}
          disabled={loading || selected.size === 0}
          className="gum-btn-primary mt-3 disabled:opacity-50"
        >
          {loading
            ? "Running…"
            : op === "delete"
            ? `Delete ${selected.size} asset(s) — irreversible`
            : `Apply to ${selected.size} asset(s)`}
        </button>

        {result && (
          <p className="mt-3 rounded-2xl border-2 border-green-500 bg-green-50 p-2 text-sm text-green-700">
            {result}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-2xl border-2 border-red-500 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>

      {history.length > 0 && (
        <div className="gum-card">
          <h2 className="mb-3 text-lg font-bold">History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gum-black text-left">
                  <th className="py-2">Kind</th>
                  <th>Affected</th>
                  <th>When</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map((op) => (
                  <tr key={op.id} className="border-b border-gray-200">
                    <td className="py-2 font-bold">{op.kind}</td>
                    <td>{op.affectedIds.length}</td>
                    <td className="text-xs">
                      {new Date(op.createdAt).toLocaleString()}
                    </td>
                    <td>
                      {op.rolledBackAt ? (
                        <span className="text-xs text-gray-500">rolled back</span>
                      ) : op.kind === "delete" ? (
                        <span className="text-xs text-gray-400">irreversible</span>
                      ) : (
                        <button
                          onClick={() => rollback(op.id)}
                          className="text-xs font-bold text-red-700 underline"
                        >
                          Roll back
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}