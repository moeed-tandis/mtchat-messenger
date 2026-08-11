import { createServerFn } from "@tanstack/react-start";

/**
 * Creates the initial super admin account on first run.
 * Idempotent and safe to call from the public login screen.
 */
export const ensureSuperAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { admin, emailForUsername, logSystem } = await import("@/lib/mtchat.server");

  const { data: existing } = await admin
    .from("user_roles")
    .select("user_id")
    .eq("role", "SUPER_ADMIN")
    .limit(1);
  if (existing && existing.length > 0) return { created: false, username: "moeed" };

  const username = "moeed";
  const email = emailForUsername(username);
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: "Modern@35043",
    email_confirm: true,
    user_metadata: { full_name: "مدیر سیستم", username },
  });

  let userId = created?.user?.id ?? null;
  if (error && !userId) {
    // The auth user may already exist without a profile/role row.
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = list?.users.find((u) => u.email === email)?.id ?? null;
    if (!userId) throw error;
  }
  if (!userId) throw new Error("bootstrap_failed");

  await admin
    .from("profiles")
    .upsert({ id: userId, username, full_name: "مدیر سیستم", avatar_color: "violet" }, { onConflict: "id" });
  await admin
    .from("user_roles")
    .upsert({ user_id: userId, role: "SUPER_ADMIN" }, { onConflict: "user_id,role" });

  await logSystem("حساب سوپر ادمین اولیه ساخته شد", { service: "auth" });
  return { created: true, username };
});
