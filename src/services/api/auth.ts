import type { Role, Session, User, UserStatus } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { emailForUsername } from "@/lib/username-email";
import { ensureSuperAdmin } from "@/lib/bootstrap.functions";
import { recordFailedLogin, recordLogin } from "@/lib/users.functions";
import { ApiError } from "../client";

export interface ProfileRow {
  id: string;
  full_name: string;
  username: string;
  status: UserStatus;
  avatar_color: string;
  last_login_at: string | null;
  created_at: string;
}

export function mapProfile(row: ProfileRow, role: Role): User {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    role,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    avatarColor: row.avatar_color,
  };
}

async function loadCurrentUser(userId: string): Promise<User | null> {
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (!profile) return null;
  const role: Role = (roles ?? []).some((r) => r.role === "SUPER_ADMIN") ? "SUPER_ADMIN" : "AGENT";
  return mapProfile(profile as ProfileRow, role);
}

/** POST /api/auth/login */
export async function login(username: string, password: string): Promise<Session> {
  // First run bootstrap: creates the initial super admin if none exists.
  try {
    await ensureSuperAdmin();
  } catch {
    // Ignore: an existing installation does not need bootstrapping.
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailForUsername(username),
    password,
  });

  if (error || !data.session || !data.user) {
    try {
      await recordFailedLogin({ data: { username: username.trim() } });
    } catch {
      /* logging must never block the UI */
    }
    throw new ApiError("نام کاربری یا رمز عبور اشتباه است.", "invalid_credentials");
  }

  const user = await loadCurrentUser(data.user.id);
  if (!user) {
    await supabase.auth.signOut();
    throw new ApiError("حساب کاربری شما پیدا نشد.", "not_found");
  }
  if (user.status === "DISABLED") {
    await supabase.auth.signOut();
    throw new ApiError("حساب کاربری شما غیرفعال شده است.", "account_disabled");
  }

  try {
    await recordLogin();
  } catch {
    /* non-blocking */
  }

  return { token: data.session.access_token, user };
}

/** POST /api/auth/logout */
export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

/** GET /api/auth/me */
export async function me(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const user = await loadCurrentUser(data.user.id);
  if (!user || user.status === "DISABLED") {
    if (user?.status === "DISABLED") await supabase.auth.signOut();
    return null;
  }
  return user;
}

export function onAuthChange(handler: () => void) {
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") handler();
  });
  return () => data.subscription.unsubscribe();
}
