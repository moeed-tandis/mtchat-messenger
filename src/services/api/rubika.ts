/**
 * Rubika bridge client (panel side).
 *
 * The panel never talks to Rubika directly: the Python worker owns the real
 * account session, reports state into the database, and picks up queued jobs.
 */
import { supabase } from "@/integrations/supabase/client";
import { sendBridgeCommandFn } from "@/lib/bridge.functions";

export interface BridgeStatus {
  state:
    | "OFFLINE"
    | "CONNECTING"
    | "AWAITING_PHONE"
    | "AWAITING_CODE"
    | "AWAITING_PASSWORD"
    | "CONNECTED"
    | "ERROR";
  guid: string | null;
  phone: string | null;
  error: string | null;
  lastHeartbeatAt: string | null;
  pendingOutbound: number;
  chats: Array<{ guid: string; title: string; avatarUrl?: string | null }>;
  counters: { inbound: number; outbound: number };
  seq: number;
}

const OFFLINE: BridgeStatus = {
  state: "OFFLINE",
  guid: null,
  phone: null,
  error: null,
  lastHeartbeatAt: null,
  pendingOutbound: 0,
  chats: [],
  counters: { inbound: 0, outbound: 0 },
  seq: 0,
};

/** GET /api/rubika/state — reads the live worker state from the database. */
export async function getBridgeState(_since = 0): Promise<{ status: BridgeStatus }> {
  const [{ data }, pending] = await Promise.all([
    supabase.from("bridge_state").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("bridge_outbox")
      .select("id", { count: "exact", head: true })
      .is("delivered_at", null),
  ]);
  if (!data) return { status: OFFLINE };

  const heartbeat = data.last_heartbeat_at ? Date.parse(data.last_heartbeat_at) : 0;
  const stale = !heartbeat || Date.now() - heartbeat > 90_000;

  return {
    status: {
      state: (stale && data.state === "CONNECTED" ? "OFFLINE" : data.state) as BridgeStatus["state"],
      guid: data.guid,
      phone: data.phone,
      error: data.error,
      lastHeartbeatAt: data.last_heartbeat_at,
      pendingOutbound: pending.count ?? 0,
      chats: (data.chats ?? []) as BridgeStatus["chats"],
      counters: { inbound: data.inbound_count, outbound: data.outbound_count },
      seq: 0,
    },
  };
}

/** Account command for the worker (super admin only). */
export async function sendBridgeCommand(
  type: "login" | "code" | "password" | "logout" | "refresh_chats",
  value?: string,
): Promise<void> {
  await sendBridgeCommandFn({ data: value === undefined ? { type } : { type, value } });
}
