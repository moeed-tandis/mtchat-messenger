import type { Role, User, UserStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import {
  createUserAccount,
  deleteUserAccount,
  resetUserPassword,
  updateUserAccount,
} from "@/lib/users.functions";
import { ApiError } from "../client";
import { mapProfile, type ProfileRow } from "./auth";

export interface CreateUserInput {
  fullName: string;
  username: string;
  password: string;
  role: Role;
  status: UserStatus;
}

/** GET /api/users */
export async function listUsers(): Promise<User[]> {
  const [{ data: profiles, error }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (error) throw new ApiError("خواندن کاربران ناموفق بود.", error.code);
  const adminIds = new Set((roles ?? []).filter((r) => r.role === "SUPER_ADMIN").map((r) => r.user_id));
  return (profiles ?? []).map((p) =>
    mapProfile(p as unknown as ProfileRow, adminIds.has(p.id) ? "SUPER_ADMIN" : "AGENT"),
  );
}

/** GET /api/users/:id */
export async function getUser(id: string): Promise<User> {
  const [{ data, error }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", id),
  ]);
  if (error || !data) throw new ApiError("کاربر یافت نشد.", "not_found");
  const role: Role = (roles ?? []).some((r) => r.role === "SUPER_ADMIN") ? "SUPER_ADMIN" : "AGENT";
  return mapProfile(data as unknown as ProfileRow, role);
}

export interface UserStats {
  activeConversations: number;
  closedConversations: number;
  sentMessages: number;
  lastActivityAt: string | null;
}

export async function getUserStats(id: string): Promise<UserStats> {
  const [active, closed, sent, last] = await Promise.all([
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("assigned_user_id", id)
      .neq("status", "CLOSED"),
    supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("assigned_user_id", id)
      .eq("status", "CLOSED"),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("author_user_id", id),
    supabase
      .from("messages")
      .select("created_at")
      .eq("author_user_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    activeConversations: active.count ?? 0,
    closedConversations: closed.count ?? 0,
    sentMessages: sent.count ?? 0,
    lastActivityAt: last.data?.created_at ?? null,
  };
}

/** POST /api/users */
export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    const result = await createUserAccount({ data: input });
    return getUser((result as { id: string }).id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    throw new ApiError(
      message.includes("duplicate") || message.includes("already")
        ? "این نام کاربری قبلاً استفاده شده است."
        : "ایجاد کاربر ناموفق بود.",
      "create_failed",
    );
  }
}

/** PATCH /api/users/:id */
export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "fullName" | "role" | "status">>,
): Promise<User> {
  await updateUserAccount({ data: { id, ...patch } });
  return getUser(id);
}

/** POST /api/users/:id/disable (and enable) */
export async function setUserStatus(id: string, status: UserStatus): Promise<User> {
  await updateUserAccount({ data: { id, status } });
  return getUser(id);
}

/** POST /api/users/:id/reset-password */
export async function resetPassword(id: string, newPassword: string): Promise<void> {
  await resetUserPassword({ data: { id, password: newPassword } });
}

/** DELETE /api/users/:id */
export async function deleteUser(id: string): Promise<void> {
  await deleteUserAccount({ data: { id } });
}
