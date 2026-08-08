import type { Role, User, UserStatus } from "@/types";
import { ApiError, delay } from "../client";
import { auditLogs, conversations, credentials, messages, securityLogs, uid, users } from "../mock/db";

export interface CreateUserInput {
  fullName: string;
  username: string;
  password: string;
  role: Role;
  status: UserStatus;
}

/** GET /api/users */
export async function listUsers(): Promise<User[]> {
  await delay();
  return [...users];
}

/** GET /api/users/:id */
export async function getUser(id: string): Promise<User> {
  await delay();
  const user = users.find((u) => u.id === id);
  if (!user) throw new ApiError("کاربر یافت نشد.", "not_found");
  return user;
}

export interface UserStats {
  activeConversations: number;
  closedConversations: number;
  sentMessages: number;
  lastActivityAt: string | null;
}

export async function getUserStats(id: string): Promise<UserStats> {
  await delay();
  const own = conversations.filter((c) => c.assignedUserId === id);
  const sent = messages.filter((m) => m.authorUserId === id);
  return {
    activeConversations: own.filter((c) => c.status !== "CLOSED").length,
    closedConversations: own.filter((c) => c.status === "CLOSED").length,
    sentMessages: sent.length,
    lastActivityAt: sent.at(-1)?.createdAt ?? null,
  };
}

/** POST /api/users */
export async function createUser(input: CreateUserInput): Promise<User> {
  await delay(400);
  if (users.some((u) => u.username === input.username)) {
    throw new ApiError("این نام کاربری قبلاً استفاده شده است.", "duplicate_username");
  }
  const user: User = {
    id: uid("u"),
    fullName: input.fullName,
    username: input.username,
    role: input.role,
    status: input.status,
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  credentials.push({ username: input.username, password: input.password, userId: user.id });
  auditLogs.unshift({
    id: uid("al"),
    userId: "u_admin",
    userName: "مدیر سیستم",
    action: `کاربر جدید ایجاد کرد (${user.fullName})`,
    createdAt: new Date().toISOString(),
    ip: "10.0.0.5",
  });
  return user;
}

/** PATCH /api/users/:id */
export async function updateUser(id: string, patch: Partial<Pick<User, "fullName" | "role" | "status">>): Promise<User> {
  await delay(350);
  const user = users.find((u) => u.id === id);
  if (!user) throw new ApiError("کاربر یافت نشد.", "not_found");
  Object.assign(user, patch);
  auditLogs.unshift({
    id: uid("al"),
    userId: "u_admin",
    userName: "مدیر سیستم",
    action: `اطلاعات کاربر ${user.fullName} را ویرایش کرد`,
    createdAt: new Date().toISOString(),
    ip: "10.0.0.5",
  });
  return user;
}

/** POST /api/users/:id/disable  (and enable) */
export async function setUserStatus(id: string, status: UserStatus): Promise<User> {
  await delay(300);
  const user = users.find((u) => u.id === id);
  if (!user) throw new ApiError("کاربر یافت نشد.", "not_found");
  user.status = status;
  if (status === "DISABLED") {
    securityLogs.unshift({
      id: uid("sec"),
      event: "ACCOUNT_DISABLED",
      userName: user.fullName,
      createdAt: new Date().toISOString(),
      ip: "10.0.0.5",
      detail: "غیرفعال‌سازی توسط مدیر",
    });
  }
  return user;
}

/** POST /api/users/:id/reset-password */
export async function resetPassword(id: string, newPassword: string): Promise<void> {
  await delay(320);
  const user = users.find((u) => u.id === id);
  if (!user) throw new ApiError("کاربر یافت نشد.", "not_found");
  const cred = credentials.find((c) => c.userId === id);
  if (cred) cred.password = newPassword;
  securityLogs.unshift({
    id: uid("sec"),
    event: "PASSWORD_CHANGED",
    userName: user.fullName,
    createdAt: new Date().toISOString(),
    ip: "10.0.0.5",
    detail: "بازنشانی رمز توسط مدیر",
  });
}
