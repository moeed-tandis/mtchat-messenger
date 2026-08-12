import type { RoutingRule } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { ApiError } from "../client";

export interface RoutingRuleView extends RoutingRule {
  userName: string;
}

export interface RoutingSettings {
  /** Prefer the last agent who interacted with the contact. */
  useLastActiveAgent: boolean;
  fallbackUserId: string | null;
  autoAssign?: boolean;
}

const SETTINGS_KEY = "routing";

const DEFAULTS: RoutingSettings = {
  useLastActiveAgent: true,
  fallbackUserId: null,
  autoAssign: true,
};

/** GET /api/routing-rules */
export async function listRoutingRules(): Promise<RoutingRuleView[]> {
  const { data, error } = await supabase
    .from("routing_rules")
    .select("id, phone, user_id, created_at, profiles:user_id(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw new ApiError("خواندن قوانین ناموفق بود.", error.code);
  return (data ?? []).map((r) => ({
    id: r.id,
    phone: r.phone,
    userId: r.user_id,
    createdAt: r.created_at,
    userName: (r.profiles as unknown as { full_name: string } | null)?.full_name ?? "-",
  }));
}

/** POST /api/routing-rules */
export async function createRoutingRule(phone: string, userId: string): Promise<RoutingRuleView> {
  const { error } = await supabase.from("routing_rules").insert({ phone, user_id: userId });
  if (error) {
    throw new ApiError(
      error.code === "23505" || error.message.includes("duplicate")
        ? "برای این شماره قانون دیگری وجود دارد."
        : "ثبت قانون ناموفق بود.",
      error.code,
    );
  }
  const rules = await listRoutingRules();
  return rules.find((r) => r.phone === phone)!;
}

/** PATCH /api/routing-rules/:id */
export async function updateRoutingRule(
  id: string,
  patch: Partial<Pick<RoutingRule, "phone" | "userId">>,
): Promise<RoutingRuleView> {
  const update: { phone?: string; user_id?: string } = {};
  if (patch.phone !== undefined) update.phone = patch.phone;
  if (patch.userId !== undefined) update.user_id = patch.userId;
  const { error } = await supabase.from("routing_rules").update(update).eq("id", id);
  if (error) throw new ApiError("ویرایش قانون ناموفق بود.", error.code);
  const rules = await listRoutingRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) throw new ApiError("قانون یافت نشد.", "not_found");
  return rule;
}

/** DELETE /api/routing-rules/:id */
export async function deleteRoutingRule(id: string): Promise<void> {
  const { error } = await supabase.from("routing_rules").delete().eq("id", id);
  if (error) throw new ApiError("حذف قانون ناموفق بود.", error.code);
}

export async function getRoutingSettings(): Promise<RoutingSettings> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  const value = (data?.value ?? {}) as Partial<RoutingSettings>;
  return { ...DEFAULTS, ...value };
}

export async function updateRoutingSettings(
  patch: Partial<RoutingSettings>,
): Promise<RoutingSettings> {
  const next = { ...(await getRoutingSettings()), ...patch };
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: SETTINGS_KEY, value: next as never, updated_at: new Date().toISOString() });
  if (error) throw new ApiError("ذخیره تنظیمات ناموفق بود.", error.code);
  return next;
}
