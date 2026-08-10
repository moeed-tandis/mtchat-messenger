import type { Message } from "@/types";
import { ApiError, delay } from "../client";
import { contacts, conversations, messageLogs, messages, uid } from "../mock/db";
import { sendToRubika } from "./rubika";

/** GET /api/conversations/:id/messages */
export async function listMessages(conversationId: string, limit = 50): Promise<Message[]> {
  await delay(180);
  const all = messages
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return all.slice(Math.max(0, all.length - limit));
}

export interface SendMessageInput {
  conversationId: string;
  text: string;
  authorUserId: string;
}

/**
 * POST /api/conversations/:id/messages
 *
 * The backend is responsible for forwarding the outbound payload
 * to the external messaging platform:
 *   { conversationId, contactId, text }
 */
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const conversation = conversations.find((c) => c.id === input.conversationId);
  if (!conversation) throw new ApiError("گفتگو یافت نشد.", "not_found");
  const contact = contacts.find((c) => c.id === conversation.contactId);

  const message: Message = {
    id: uid("m"),
    conversationId: input.conversationId,
    direction: "OUTBOUND",
    type: "text",
    text: input.text,
    authorUserId: input.authorUserId,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };
  messages.push(message);

  // Forward to the real Rubika account through the worker bridge.
  let bridgeError = false;
  if (contact?.rubikaId) {
    try {
      await sendToRubika(contact.rubikaId, input.text);
    } catch {
      bridgeError = true;
    }
  }

  await delay(300);

  // Simulated upstream failure for a deterministic error state.
  const failed = bridgeError || input.text.trim() === "!fail";
  message.status = failed ? "FAILED" : "SENT";

  if (!failed) {
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessagePreview = input.text;
    conversation.assignedUserId = conversation.assignedUserId ?? input.authorUserId;
    if (contact) {
      contact.lastActiveAgentId = input.authorUserId;
      contact.lastContactAt = message.createdAt;
      contact.lastMessagePreview = input.text;
    }
  }

  messageLogs.unshift({
    id: uid("ml"),
    messageId: message.id,
    conversationId: input.conversationId,
    contactName: contact?.name ?? "نامشخص",
    direction: "OUTBOUND",
    status: failed ? "FAILED" : "SUCCESS",
    createdAt: message.createdAt,
    payload: {
      conversationId: input.conversationId,
      contactId: contact?.rubikaId,
      text: input.text,
      ...(failed ? { error: "upstream_timeout" } : {}),
    },
  });

  if (failed) throw new ApiError("ارسال پیام ناموفق بود.", "send_failed");
  return message;
}

/** POST /api/messages/:id/retry */
export async function retryMessage(messageId: string): Promise<Message> {
  const message = messages.find((m) => m.id === messageId);
  if (!message) throw new ApiError("پیام یافت نشد.", "not_found");
  message.status = "PENDING";
  await delay(600);
  message.status = "SENT";
  return message;
}
