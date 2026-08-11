import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum(["SUPER_ADMIN", "AGENT"]);
const statusEnum = z.enum(["ACTIVE", "DISABLED"]);

const createSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/, "نام کاربری فقط حروف انگلیسی، عدد، نقطه و خط تیره"),
  password: z.string().min(8).max(72),
  role: roleEnum,
  status: statusEnum,
});

/** Creates a real login account (super admin only). */
export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { admin, emailForUsername, requireSuperAdmin, logAudit } = await import(
      "@/lib/mtchat.server"
    );
    await requireSuperAdmin(context.userId);

    const username = data.username.toLowerCase();
    const { data: dup } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (dup) throw new Error("این نام کاربری قبلاً استفاده شده است.");

    const { data: created, error } = await admin.auth.admin.createUser({
      email: emailForUsername(username),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName, username },
    });
    if (error || !created?.user) throw new Error(error?.message ?? "ایجاد حساب ناموفق بود.");

    const userId = created.user.id;
    const colors = ["blue", "violet", "emerald", "amber", "rose", "cyan"];
    await admin.from("profiles").insert({
      id: userId,
      username,
      full_name: data.fullName,
      status: data.status,
      avatar_color: colors[Math.floor(Math.random() * colors.length)]!,
    });
    await admin.from("user_roles").insert({ user_id: userId, role: data.role });
    await logAudit(context.userId, `کاربر جدید ایجاد کرد (${data.fullName})`);
    return { id: userId };
  });

/** Updates name, role and status of an existing account (super admin only). */
export const updateUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        fullName: z.string().trim().min(2).max(80).optional(),
        role: roleEnum.optional(),
        status: statusEnum.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, requireSuperAdmin, logAudit, logSecurity, profileName } = await import(
      "@/lib/mtchat.server"
    );
    await requireSuperAdmin(context.userId);

    const patch: Record<string, unknown> = {};
    if (data.fullName !== undefined) patch['full_name'] = data.fullName;
    if (data.status !== undefined) patch['status'] = data.status;
    if (Object.keys(patch).length) {
      const { error } = await admin.from("profiles").update(patch).eq("id", data.id);
      if (error) throw error;
    }

    if (data.role) {
      await admin.from("user_roles").delete().eq("user_id", data.id);
      await admin.from("user_roles").insert({ user_id: data.id, role: data.role });
      await logSecurity("PERMISSION_CHANGED", await profileName(data.id), `نقش به ${data.role} تغییر کرد`);
    }

    if (data.status === "DISABLED") {
      await admin.auth.admin.updateUserById(data.id, { ban_duration: "876000h" });
      await logSecurity("ACCOUNT_DISABLED", await profileName(data.id), "غیرفعال‌سازی توسط مدیر");
    } else if (data.status === "ACTIVE") {
      await admin.auth.admin.updateUserById(data.id, { ban_duration: "none" });
    }

    await logAudit(context.userId, `اطلاعات کاربر ${await profileName(data.id)} را ویرایش کرد`);
    return { ok: true };
  });

/** Sets a new password for an account (super admin only). */
export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), password: z.string().min(8).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, requireSuperAdmin, logSecurity, profileName } = await import(
      "@/lib/mtchat.server"
    );
    await requireSuperAdmin(context.userId);
    const { error } = await admin.auth.admin.updateUserById(data.id, { password: data.password });
    if (error) throw error;
    await logSecurity("PASSWORD_CHANGED", await profileName(data.id), "بازنشانی رمز توسط مدیر");
    return { ok: true };
  });

/** Permanently deletes an account (super admin only). */
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, requireSuperAdmin, logAudit, profileName } = await import(
      "@/lib/mtchat.server"
    );
    await requireSuperAdmin(context.userId);
    if (data.id === context.userId) throw new Error("نمی‌توانید حساب خودتان را حذف کنید.");
    const name = await profileName(data.id);
    await admin.from("user_roles").delete().eq("user_id", data.id);
    await admin.from("profiles").delete().eq("id", data.id);
    const { error } = await admin.auth.admin.deleteUser(data.id);
    if (error) throw error;
    await logAudit(context.userId, `کاربر ${name} را حذف کرد`);
    return { ok: true };
  });

/** Changes the signed-in user's own password. */
export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ password: z.string().min(8).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, logSecurity, profileName } = await import("@/lib/mtchat.server");
    const { error } = await admin.auth.admin.updateUserById(context.userId, {
      password: data.password,
    });
    if (error) throw error;
    await logSecurity("PASSWORD_CHANGED", await profileName(context.userId), "تغییر رمز توسط کاربر");
    return { ok: true };
  });

/** Records a successful sign-in (last login + security log). */
export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { admin, logSecurity, profileName } = await import("@/lib/mtchat.server");
    await admin
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", context.userId);
    await logSecurity("LOGIN_SUCCESS", await profileName(context.userId), "ورود موفق");
    return { ok: true };
  });

/** Records a failed sign-in attempt (unauthenticated on purpose). */
export const recordFailedLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().trim().max(64) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { logSecurity } = await import("@/lib/mtchat.server");
    await logSecurity(
      "LOGIN_FAILED",
      data.username || "-",
      "نام کاربری یا رمز عبور نامعتبر",
    );
    return { ok: true };
  });
