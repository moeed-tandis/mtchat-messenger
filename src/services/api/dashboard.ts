import type { DashboardData } from "@/types";
import { delay } from "../client";
import {
  activitySeries,
  auditLogs,
  contacts,
  conversations,
  messageLogs,
  messages,
  users,
} from "../mock/db";

/** GET /api/dashboard */
export async function getDashboard(): Promise<DashboardData> {
  await delay(320);
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayIso = startOfDay.toISOString();

  return {
    stats: {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === "ACTIVE").length,
      openConversations: conversations.filter((c) => c.status === "OPEN").length,
      todayConversations: conversations.filter((c) => c.lastMessageAt >= todayIso).length,
      todayMessages: messages.filter((m) => m.createdAt >= todayIso).length,
      failedMessages: messageLogs.filter((l) => l.status === "FAILED").length,
    },
    activity: activitySeries,
    recentConversations: conversations
      .slice()
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      .slice(0, 6)
      .map((c) => ({
        conversationId: c.id,
        contactName: contacts.find((ct) => ct.id === c.contactId)?.name ?? "نامشخص",
        lastMessagePreview: c.lastMessagePreview,
        assignedUserName:
          users.find((u) => u.id === c.assignedUserId)?.fullName ?? "اختصاص نیافته",
        status: c.status,
        lastMessageAt: c.lastMessageAt,
      })),
    recentActivity: auditLogs.slice(0, 6),
    health: {
      server: "CONNECTED",
      database: "CONNECTED",
      api: "CONNECTED",
      messaging: "CONNECTED",
    },
  };
}
