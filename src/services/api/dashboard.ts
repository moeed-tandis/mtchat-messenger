import type { ConnectionStatus, DashboardData } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOverview } from "@/lib/bridge.functions";
import { listAuditLogs } from "./logs";

/** GET /api/dashboard */
export async function getDashboard(): Promise<DashboardData> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayIso = startOfDay.toISOString();

  const [
    profiles,
    activeProfiles,
    open,
    todayConversations,
    todayMessages,
    failedMessages,
    recent,
    bridge,
    overview,
    audit,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .gte("last_message_at", todayIso),
    supabase.from("messages").select("id", { count: "exact", head: true }).gte("created_at", todayIso),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("status", "FAILED"),
    supabase
      .from("conversations")
      .select("id, status, last_message_at, last_message_preview, contacts:contact_id(name), profiles:assigned_user_id(full_name)")
      .order("last_message_at", { ascending: false })
      .limit(6),
    supabase.from("bridge_state").select("state, last_heartbeat_at").eq("id", 1).maybeSingle(),
    getAdminOverview().catch(() => ({ activity: [] })),
    listAuditLogs({ page: 1 }).catch(() => ({ items: [], total: 0, page: 1, pageSize: 10 })),
  ]);

  const messaging: ConnectionStatus =
    bridge.data?.state === "CONNECTED"
      ? "CONNECTED"
      : bridge.data?.state === "OFFLINE" || !bridge.data
        ? "DISCONNECTED"
        : "DEGRADED";

  return {
    stats: {
      totalUsers: profiles.count ?? 0,
      activeUsers: activeProfiles.count ?? 0,
      openConversations: open.count ?? 0,
      todayConversations: todayConversations.count ?? 0,
      todayMessages: todayMessages.count ?? 0,
      failedMessages: failedMessages.count ?? 0,
    },
    activity: overview.activity,
    recentConversations: (recent.data ?? []).map((row) => {
      const contact = row.contacts as unknown as { name: string } | null;
      const agent = row.profiles as unknown as { full_name: string } | null;
      return {
        conversationId: row.id,
        contactName: contact?.name || "نامشخص",
        lastMessagePreview: row.last_message_preview,
        assignedUserName: agent?.full_name ?? "اختصاص نیافته",
        status: row.status,
        lastMessageAt: row.last_message_at,
      };
    }),
    recentActivity: audit.items.slice(0, 6),
    health: {
      server: "CONNECTED",
      database: "CONNECTED",
      api: "CONNECTED",
      messaging,
    },
  };
}
