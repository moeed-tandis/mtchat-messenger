import type { Session, User } from "@/types";
import { ApiError, delay } from "../client";
import { credentials, securityLogs, uid, users } from "../mock/db";

const SESSION_KEY = "mtchat.session";

/** POST /api/auth/login */
export async function login(username: string, password: string): Promise<Session> {
  await delay(500);
  const cred = credentials.find((c) => c.username === username.trim());
  if (!cred || cred.password !== password) {
    securityLogs.unshift({
      id: uid("sec"),
      event: "LOGIN_FAILED",
      userName: username || "-",
      createdAt: new Date().toISOString(),
      ip: "192.168.1.10",
      detail: "نام کاربری یا رمز عبور نامعتبر",
    });
    throw new ApiError("نام کاربری یا رمز عبور اشتباه است.", "invalid_credentials");
  }
  const user = users.find((u) => u.id === cred.userId)!;
  if (user.status === "DISABLED") {
    throw new ApiError("حساب کاربری شما غیرفعال شده است.", "account_disabled");
  }
  user.lastLoginAt = new Date().toISOString();
  securityLogs.unshift({
    id: uid("sec"),
    event: "LOGIN_SUCCESS",
    userName: user.fullName,
    createdAt: new Date().toISOString(),
    ip: "192.168.1.10",
    detail: "ورود موفق",
  });
  const session: Session = { token: `mock.${user.id}.${Date.now()}`, user };
  persistSession(session);
  return session;
}

/** POST /api/auth/logout */
export async function logout(): Promise<void> {
  const session = readSession();
  if (session) {
    securityLogs.unshift({
      id: uid("sec"),
      event: "LOGOUT",
      userName: session.user.fullName,
      createdAt: new Date().toISOString(),
      ip: "192.168.1.10",
      detail: "خروج از حساب",
    });
  }
  clearSession();
  await delay(120);
}

/** GET /api/auth/me */
export async function me(): Promise<User | null> {
  await delay(80);
  const session = readSession();
  if (!session) return null;
  const fresh = users.find((u) => u.id === session.user.id);
  if (!fresh || fresh.status === "DISABLED") {
    clearSession();
    return null;
  }
  return fresh;
}

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function persistSession(session: Session) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_KEY);
}
