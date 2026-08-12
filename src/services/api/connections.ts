import type { Connection } from "@/types";
import { getBridgeState } from "./rubika";
import { ApiError } from "../client";

/**
 * Connections represent external messaging platforms (currently Rubika).
 * Status is derived from the live worker heartbeat stored in the database.
 */
export async function listConnections(): Promise<Connection[]> {
  const { status } = await getBridgeState();
  return [
    {
      id: "rubika",
      name: "حساب روبیکا",
      provider: "Rubika",
      status:
        status.state === "CONNECTED"
          ? "CONNECTED"
          : status.state === "OFFLINE"
            ? "DISCONNECTED"
            : "DEGRADED",
      lastMessageAt: status.lastHeartbeatAt ?? new Date(0).toISOString(),
      inboundCount: status.counters.inbound,
      outboundCount: status.counters.outbound,
    },
  ];
}

export async function getConnectionStatus(id: string): Promise<Connection> {
  const connection = (await listConnections()).find((c) => c.id === id);
  if (!connection) throw new ApiError("اتصال یافت نشد.", "not_found");
  return connection;
}

export async function testConnection(id: string): Promise<{ ok: boolean; latencyMs: number }> {
  const started = performance.now();
  const connection = await getConnectionStatus(id);
  return {
    ok: connection.status === "CONNECTED",
    latencyMs: Math.round(performance.now() - started),
  };
}
