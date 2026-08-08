import type { Conversation, ConversationStatus, Message } from "@/types";
import { ApiError, delay } from "../client";
import {
  auditLogs,
  contacts,
  conversations,
  messageLogs,
  messages,
  uid,
  users,
} from "../mock/db";

export interface ConversationListItem extends Conversation {
  contactName: string;
  contactPhone: string;
  contactRubikaId: string;
  assignedUserName: string | null;
}

export interface ConversationFilters {
  scope?: "ALL" | "MINE" | "UNREAD" | "OPEN" | "PENDING" | "CLOSED";
  query?: string;
  currentUserId?: string;
  /** Agents only see their own conversations. */
  restrictToUserId?: string;
}

function decorate(conversation: Conversation): ConversationListItem {
  const contact = contacts.find((c) => c.id === conversation.contactId);
  const agent = users.find((u) => u.id === conversation.assignedUserId);
  return {
    ...conversation,
    contactName: contact?.name ?? "نامشخص",
    contactPhone: contact?.phone ?? "",
    contactRubikaId: contact?.rubikaId ?? "",
    assignedUserName: agent?.fullName ?? null,
  };
}

/** GET /api/conversations */
export async function listConversations(
  filters: ConversationFilters = {},
): Promise<ConversationListItem[]> {
  await delay();
  let items = conversations.map(decorate);

  if (filters.restrictToUserId) {
    items = items.filter((c) => c.assignedUserId === filters.restrictToUserId);
  }

  switch (filters.scope) {
    case "MINE":
      items = items.filter((c) => c.assignedUserId === filters.currentUserId);
      break;
    case "UNREAD":
      items = items.filter((c) => c.unreadCount > 0);
      break;
    case "OPEN":
      items = items.filter((c) => c.status === "OPEN");
      break;
    case "PENDING":
      items = items.filter((c) => c.status === "PENDING");
      break;
    case "CLOSED":
      items = items.filter((c) => c.status === "CLOSED");
      break;
    default:
      break;
  }

  const q = (filters.query ?? "").trim().toLowerCase();
  if (q) {
    items = items.filter((c) => {
      const inMessages = messages.some(
        (m) => m.conversationId === c.id && m.text.toLowerCase().includes(q),
      );
      return (
        c.contactName.toLowerCase().includes(q) ||
        c.contactPhone.includes(q) ||
        c.contactRubikaId.toLowerCase().includes(q) ||
        inMessages
      );
    });
  }

  return items.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
}

/** GET /api/conversations/:id */
export async function getConversation(id: string): Promise<ConversationListItem> {
  await delay();
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) throw new ApiError("گفتگو یافت نشد.", "not_found");
  return decorate(conversation);
}

/** PATCH /api/conversations/:id */
export async function updateConversationStatus(
  id: string,
  status: ConversationStatus,
): Promise<ConversationListItem> {
  await delay(280);
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) throw new ApiError("گفتگو یافت نشد.", "not_found");
  conversation.status = status;
  auditLogs.unshift({
    id: uid("al"),
    userId: conversation.assignedUserId ?? "u_admin",
    userName: users.find((u) => u.id === conversation.assignedUserId)?.fullName ?? "مدیر سیستم",
    action:
      status === "CLOSED"
        ? "گفتگو را بست"
        : status === "PENDING"
          ? "گفتگو را به انتظار منتقل کرد"
          : "گفتگو را باز کرد",
    createdAt: new Date().toISOString(),
    ip: "192.168.1.24",
  });
  return decorate(conversation);
}

/** POST /api/conversations/:id/assign */
export async function assignConversation(
  id: string,
  userId: string,
): Promise<ConversationListItem> {
  await delay(320);
  const conversation = conversations.find((c) => c.id === id);
  if (!conversation) throw new ApiError("گفتگو یافت نشد.", "not_found");
  conversation.assignedUserId = userId;
  const contact = contacts.find((c) => c.id === conversation.contactId);
  if (contact) {
    contact.assignedUserId = userId;
    contact.lastActiveAgentId = userId;
  }
  auditLogs.unshift({
    id: uid("al"),
    userId,
    userName: users.find((u) => u.id === userId)?.fullName ?? "-",
    action: "گفتگو به او اختصاص داده شد",
    createdAt: new Date().toISOString(),
    ip: "10.0.0.5",
  });
  return decorate(conversation);
}

/** POST /api/conversations/:id/read */
export async function markConversationRead(id: string): Promise<void> {
  await delay(100);
  const conversation = conversations.find((c) => c.id === id);
  if (conversation) conversation.unreadCount = 0;
}

/**
 * Simulates a new inbound message arriving from the external platform.
 * The real inbound path is: Rubika -> backend adapter -> realtime event.
 */
export function pushInboundMessage(conversationId: string, text: string): Message | null {
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return null;
  const contact = contacts.find((c) => c.id === conversation.contactId);
  const message: Message = {
    id: uid("m"),
    conversationId,
    externalMessageId: `rubika-msg-${Math.floor(Math.random() * 99999)}`,
    direction: "INBOUND",
    type: "text",
    text,
    status: "SENT",
    createdAt: new Date().toISOString(),
  };
  messages.push(message);
  conversation.unreadCount += 1;
  conversation.lastMessageAt = message.createdAt;
  conversation.lastMessagePreview = text;
  if (contact) contact.lastContactAt = message.createdAt;
  messageLogs.unshift({
    id: uid("ml"),
    messageId: message.id,
    conversationId,
    contactName: contact?.name ?? "نامشخص",
    direction: "INBOUND",
    status: "SUCCESS",
    createdAt: message.createdAt,
    payload: {
      externalMessageId: message.externalMessageId,
      contact: { id: contact?.rubikaId, phone: contact?.phone, name: contact?.name },
      message: { type: "text", text, timestamp: message.createdAt },
    },
  });
  return message;
}
