import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Connector worker credentials + endpoints (super admin only). */
export const getBridgeConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireSuperAdmin, getBridgeToken } = await import("@/lib/mtchat.server");
    await requireSuperAdmin(context.userId);
    return { token: await getBridgeToken() };
  });

export const rotateBridgeTokenFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireSuperAdmin, rotateBridgeToken, logSecurity, profileName } = await import(
      "@/lib/mtchat.server"
    );
    await requireSuperAdmin(context.userId);
    const token = await rotateBridgeToken();
    await logSecurity("PERMISSION_CHANGED", await profileName(context.userId), "توکن اتصال روبیکا بازنشانی شد");
    return { token };
  });

/** Queues an account command for the Rubika worker (super admin only). */
export const sendBridgeCommandFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        type: z.enum(["login", "code", "password", "logout", "refresh_chats"]),
        value: z.string().trim().max(120).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, requireSuperAdmin, queueCommand, logAudit } = await import(
      "@/lib/mtchat.server"
    );
    await requireSuperAdmin(context.userId);
    await queueCommand(data.type, data.value ?? null);

    if (data.type === "login") {
      await admin
        .from("bridge_state")
        .update({ state: "CONNECTING", phone: data.value ?? null, error: null })
        .eq("id", 1);
    }
    if (data.type === "logout") {
      await admin
        .from("bridge_state")
        .update({ state: "OFFLINE", guid: null, error: null, chats: [] })
        .eq("id", 1);
    }
    await logAudit(context.userId, `دستور اتصال روبیکا: ${data.type}`);
    return { ok: true };
  });

/** Aggregated numbers for the dashboard / logs pages (super admin only). */
export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, requireSuperAdmin } = await import("@/lib/mtchat.server");
    await requireSuperAdmin(context.userId);

    const since = new Date(Date.now() - 6 * 24 * 3600 * 1000);
    since.setHours(0, 0, 0, 0);
    const { data: recent } = await admin
      .from("messages")
      .select("direction, created_at")
      .gte("created_at", since.toISOString());

    const days: Array<{ label: string; inbound: number; outbound: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const inRange = (recent ?? []).filter(
        (m) => m.created_at >= day.toISOString() && m.created_at < next.toISOString(),
      );
      days.push({
        label: new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(day),
        inbound: inRange.filter((m) => m.direction === "INBOUND").length,
        outbound: inRange.filter((m) => m.direction === "OUTBOUND").length,
      });
    }
    return { activity: days };
  });
