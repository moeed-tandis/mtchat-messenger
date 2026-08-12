import type { AuditLog, LogLevel, MessageLog, SecurityEvent, SecurityLog, SystemLog } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import type { Paginated } from "@/types";

const PAGE_SIZE = 10;

function range(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE - 1 };
}

/** GET /api/logs */
export async function listSystemLogs(
  opts: { level?: LogLevel | "ALL"; query?: string; page?: number } = {},
): Promise<Paginated<SystemLog>> {
  const page = opts.page ?? 1;
  const { from, to } = range(page);
  let query = supabase
    .from("system_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (opts.level && opts.level !== "ALL") query = query.eq("level", opts.level);
  const q = (opts.query ?? "").trim();
  if (q) query = query.or(`event.ilike.%${q}%,service.ilike.%${q}%`);
  const { data, count } = await query.range(from, to);
  return {
    items: (data ?? []).map((l) => ({
      id: l.id,
      createdAt: l.created_at,
      level: l.level as LogLevel,
      service: l.service,
      event: l.event,
      status: l.status,
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

/** GET /api/message-logs */
export async function listMessageLogs(
  opts: { query?: string; page?: number } = {},
): Promise<Paginated<MessageLog>> {
  const page = opts.page ?? 1;
  const { from, to } = range(page);
  let query = supabase
    .from("message_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  const q = (opts.query ?? "").trim();
  if (q) query = query.ilike("contact_name", `%${q}%`);
  const { data, count } = await query.range(from, to);
  return {
    items: (data ?? []).map((l) => ({
      id: l.id,
      messageId: l.message_id ?? "-",
      conversationId: l.conversation_id ?? "-",
      contactName: l.contact_name,
      direction: l.direction,
      status: l.status as MessageLog["status"],
      createdAt: l.created_at,
      payload: (l.payload ?? {}) as Record<string, unknown>,
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

/** GET /api/audit-logs */
export async function listAuditLogs(
  opts: { query?: string; page?: number } = {},
): Promise<Paginated<AuditLog>> {
  const page = opts.page ?? 1;
  const { from, to } = range(page);
  let query = supabase
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  const q = (opts.query ?? "").trim();
  if (q) query = query.or(`user_name.ilike.%${q}%,action.ilike.%${q}%`);
  const { data, count } = await query.range(from, to);
  return {
    items: (data ?? []).map((l) => ({
      id: l.id,
      userId: l.user_id ?? "",
      userName: l.user_name || "سیستم",
      action: l.action,
      createdAt: l.created_at,
      ip: l.ip,
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

/** GET /api/security-logs */
export async function listSecurityLogs(
  opts: { query?: string; page?: number } = {},
): Promise<Paginated<SecurityLog>> {
  const page = opts.page ?? 1;
  const { from, to } = range(page);
  let query = supabase
    .from("security_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  const q = (opts.query ?? "").trim();
  if (q) query = query.or(`user_name.ilike.%${q}%,event.ilike.%${q}%`);
  const { data, count } = await query.range(from, to);
  return {
    items: (data ?? []).map((l) => ({
      id: l.id,
      event: l.event as SecurityEvent,
      userName: l.user_name || "-",
      createdAt: l.created_at,
      ip: l.ip,
      detail: l.detail,
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}
