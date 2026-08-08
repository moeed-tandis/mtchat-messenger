import type { Connection } from "@/types";
import { ApiError, delay } from "../client";
import { connections } from "../mock/db";

/**
 * Connections represent external messaging platforms (e.g. Rubika).
 * The actual platform integration lives in the backend adapter; this
 * layer only reads/monitors status.
 */

/** GET /api/connections */
export async function listConnections(): Promise<Connection[]> {
  await delay();
  return [...connections];
}

/** GET /api/connections/:id/status */
export async function getConnectionStatus(id: string): Promise<Connection> {
  await delay(400);
  const connection = connections.find((c) => c.id === id);
  if (!connection) throw new ApiError("اتصال یافت نشد.", "not_found");
  return { ...connection };
}

/** POST /api/connections/:id/test */
export async function testConnection(id: string): Promise<{ ok: boolean; latencyMs: number }> {
  await delay(800);
  const connection = connections.find((c) => c.id === id);
  if (!connection) throw new ApiError("اتصال یافت نشد.", "not_found");
  return { ok: connection.status === "CONNECTED", latencyMs: 120 + Math.floor(Math.random() * 80) };
}
