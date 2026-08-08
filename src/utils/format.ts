import type { ConversationStatus, LogLevel, MessageStatus, Role } from "@/types";

const dateTimeFormatter = new Intl.DateTimeFormat("fa-IR", {
  hour: "2-digit",
  minute: "2-digit",
});

const fullFormatter = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dayFormatter = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatDay(iso: string) {
  return dayFormatter.format(new Date(iso));
}

export function formatFull(iso: string) {
  return fullFormatter.format(new Date(iso));
}

export function formatSmart(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  if (sameDay) return formatTime(iso);
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) return "دیروز";
  return dayFormatter.format(date);
}

export function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "همین حالا";
  if (minutes < 60) return `${toFa(minutes)} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${toFa(hours)} ساعت پیش`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${toFa(days)} روز پیش`;
  return formatDay(iso);
}

export function toFa(value: number | string) {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]!);
}

export function formatNumber(value: number) {
  return toFa(new Intl.NumberFormat("en-US").format(value));
}

export const statusLabels: Record<ConversationStatus, string> = {
  OPEN: "باز",
  PENDING: "در انتظار",
  CLOSED: "بسته",
};

export const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "مدیر ارشد",
  AGENT: "کارشناس",
};

export const messageStatusLabels: Record<MessageStatus, string> = {
  PENDING: "ارسال...",
  SENT: "ارسال شد",
  DELIVERED: "تحویل شد",
  READ: "خوانده شد",
  FAILED: "ارسال ناموفق",
};

export const logLevelLabels: Record<LogLevel, string> = {
  INFO: "اطلاع",
  WARNING: "هشدار",
  ERROR: "خطا",
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2);
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`;
}
