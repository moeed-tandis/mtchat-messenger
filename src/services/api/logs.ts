import type { AuditLog, LogLevel, MessageLog, SecurityLog, SystemLog } from "@/types";
import { delay, paginate } from "../client";
import { auditLogs, messageLogs, securityLogs, systemLogs } from "../mock/db";

/** GET /api/logs */
export async function listSystemLogs(opts: { level?: LogLevel | "ALL"; query?: string; page?: number } = {}) {
  await delay();
  let items: SystemLog[] = [...systemLogs];
  if (opts.level && opts.level !== "ALL") items = items.filter((l) => l.level === opts.level);
  const q = (opts.query ?? "").trim().toLowerCase();
  if (q) {
    items = items.filter(
      (l) => l.event.toLowerCase().includes(q) || l.service.toLowerCase().includes(q),
    );
  }
  return paginate(items, opts.page ?? 1, 10);
}

/** GET /api/message-logs */
export async function listMessageLogs(opts: { query?: string; page?: number } = {}) {
  await delay();
  let items: MessageLog[] = [...messageLogs];
  const q = (opts.query ?? "").trim().toLowerCase();
  if (q) {
    items = items.filter(
      (l) => l.contactName.toLowerCase().includes(q) || l.messageId.toLowerCase().includes(q),
    );
  }
  return paginate(items, opts.page ?? 1, 10);
}

/** GET /api/audit-logs */
export async function listAuditLogs(opts: { query?: string; page?: number } = {}) {
  await delay();
  let items: AuditLog[] = [...auditLogs];
  const q = (opts.query ?? "").trim().toLowerCase();
  if (q) {
    items = items.filter(
      (l) => l.userName.toLowerCase().includes(q) || l.action.toLowerCase().includes(q),
    );
  }
  return paginate(items, opts.page ?? 1, 10);
}

/** GET /api/security-logs */
export async function listSecurityLogs(opts: { query?: string; page?: number } = {}) {
  await delay();
  let items: SecurityLog[] = [...securityLogs];
  const q = (opts.query ?? "").trim().toLowerCase();
  if (q) {
    items = items.filter(
      (l) => l.userName.toLowerCase().includes(q) || l.event.toLowerCase().includes(q),
    );
  }
  return paginate(items, opts.page ?? 1, 10);
}
