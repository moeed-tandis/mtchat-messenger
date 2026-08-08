import type { RoutingRule } from "@/types";
import { ApiError, delay } from "../client";
import { routingRules, uid, users } from "../mock/db";

export interface RoutingRuleView extends RoutingRule {
  userName: string;
}

export interface RoutingSettings {
  /** Prefer the last agent who interacted with the contact. */
  useLastActiveAgent: boolean;
  fallbackUserId: string | null;
}

const settings: RoutingSettings = {
  useLastActiveAgent: true,
  fallbackUserId: "u_ali",
};

function decorate(rule: RoutingRule): RoutingRuleView {
  return { ...rule, userName: users.find((u) => u.id === rule.userId)?.fullName ?? "-" };
}

/** GET /api/routing-rules */
export async function listRoutingRules(): Promise<RoutingRuleView[]> {
  await delay();
  return routingRules.map(decorate);
}

/** POST /api/routing-rules */
export async function createRoutingRule(phone: string, userId: string): Promise<RoutingRuleView> {
  await delay(300);
  if (routingRules.some((r) => r.phone === phone)) {
    throw new ApiError("برای این شماره قانون دیگری وجود دارد.", "duplicate");
  }
  const rule: RoutingRule = { id: uid("r"), phone, userId, createdAt: new Date().toISOString() };
  routingRules.unshift(rule);
  return decorate(rule);
}

/** PATCH /api/routing-rules/:id */
export async function updateRoutingRule(
  id: string,
  patch: Partial<Pick<RoutingRule, "phone" | "userId">>,
): Promise<RoutingRuleView> {
  await delay(280);
  const rule = routingRules.find((r) => r.id === id);
  if (!rule) throw new ApiError("قانون یافت نشد.", "not_found");
  Object.assign(rule, patch);
  return decorate(rule);
}

/** DELETE /api/routing-rules/:id */
export async function deleteRoutingRule(id: string): Promise<void> {
  await delay(240);
  const index = routingRules.findIndex((r) => r.id === id);
  if (index >= 0) routingRules.splice(index, 1);
}

export async function getRoutingSettings(): Promise<RoutingSettings> {
  await delay(120);
  return { ...settings };
}

export async function updateRoutingSettings(patch: Partial<RoutingSettings>): Promise<RoutingSettings> {
  await delay(200);
  Object.assign(settings, patch);
  return { ...settings };
}
