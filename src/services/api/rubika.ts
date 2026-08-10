/**
 * Rubika bridge client (panel side).
 *
 * The panel never talks to Rubika directly — it talks to the Node/TanStack
 * server, and a long-running rubpy worker owns the real account session.
 */
import type { Message } from "@/types";
import { pushInboundMessage } from "./conversations";
import { pushNotification } from "./notifications";
import { contacts, conversations, routingRules, uid, users } from "../mock/db";

export interface BridgeStatus {
  state:
    | "OFFLINE"
    | "CONNECTING"
    | "AWAITING_PHONE"
    | "AWAITING_CODE"
    | "AWAITING_PASSWORD"
    | "CONNECTED"
    | "ERROR";
  guid: string | null;
  phone: string | null;
  error: string | null;
  lastHeartbeatAt: string | null;
  pendingOutbound: number;
  chats: Array<{ guid: string; title: string }>;
  counters: { inbound: number; outbound: number };
  seq: number;
}

export interface BridgeInbound {
  seq: number;
  chatGuid: string;
  chatTitle: string;
  messageId: string;
  type: string;
  text: string;
  fileName?: string;
  isMe: boolean;
  createdAt: string;
}

/** GET /api/rubika/state */
export async function getBridgeState(since = 0): Promise<{
  status: BridgeStatus;
  messages: BridgeInbound[];
}> {
  const res = await fetch(`/api/rubika/state?since=${since}`);
  if (!res.ok) throw new Error(`bridge_unavailable_${res.status}`);
  return (await res.json()) as { status: BridgeStatus; messages: BridgeInbound[] };
}

/** POST /api/rubika/state — queue an outbound message for the worker. */
export async function sendToRubika(chatGuid: string, text: string): Promise<void> {
  await fetch("/api/rubika/state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "send", chatGuid, text }),
  });
}

/** POST /api/rubika/state — account command (super admin only surface). */
export async function sendBridgeCommand(
  type: "login" | "code" | "password" | "logout" | "refresh_chats",
  value?: string,
): Promise<void> {
  const res = await fetch("/api/rubika/state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "command", type, value }),
  });
  if (!res.ok) throw new Error("command_failed");
}

/** Routing: rule by phone → last active agent → fallback → least loaded. */
function pickAgent(contactId: string): string | null {
  const contact = contacts.find((c) => c.id === contactId);
  const rule = contact ? routingRules.find((r) => r.phone === contact.phone) : undefined;
  if (rule) return rule.userId;
  if (contact?.lastActiveAgentId) return contact.lastActiveAgentId;
  const agents = users.filter((u) => u.role === "AGENT" && u.status === "ACTIVE");
  if (agents.length === 0) return null;
  const load = new Map(agents.map((a) => [a.id, 0]));
  conversations.forEach((c) => {
    if (c.assignedUserId && load.has(c.assignedUserId)) {
      load.set(c.assignedUserId, (load.get(c.assignedUserId) ?? 0) + 1);
    }
  });
  return [...load.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
}

/**
 * Maps a raw Rubika chat into the panel's contact/conversation model,
 * creating both on first contact, then appends the inbound message.
 */
export function ingestRubikaMessage(item: BridgeInbound): Message | null {
  if (item.isMe) return null;

  let contact = contacts.find((c) => c.rubikaId === item.chatGuid);
  if (!contact) {
    contact = {
      id: uid("c"),
      rubikaId: item.chatGuid,
      name: item.chatTitle || item.chatGuid,
      phone: "",
      firstContactAt: item.createdAt,
      lastContactAt: item.createdAt,
      assignedUserId: null,
      lastActiveAgentId: null,
      tags: ["روبیکا"],
      notes: [],
      conversationCount: 0,
      lastMessagePreview: item.text,
    };
    contacts.unshift(contact);
  }

  let conversation = conversations.find(
    (c) => c.contactId === contact!.id && c.status !== "CLOSED",
  );
  if (!conversation) {
    const assignedUserId = pickAgent(contact.id);
    conversation = {
      id: uid("cv"),
      contactId: contact.id,
      assignedUserId,
      status: "OPEN",
      unreadCount: 0,
      lastMessageAt: item.createdAt,
      lastMessagePreview: item.text,
      createdAt: item.createdAt,
    };
    conversations.unshift(conversation);
    contact.conversationCount += 1;
    contact.assignedUserId = assignedUserId;
  }

  const text = item.text || (item.fileName ? `📎 ${item.fileName}` : `[${item.type}]`);
  const message = pushInboundMessage(conversation.id, text);
  if (!message) return null;

  pushNotification({
    id: uid("nt"),
    title: `پیام جدید از ${contact.name}`,
    body: text,
    createdAt: message.createdAt,
    read: false,
    conversationId: conversation.id,
  });
  return message;
}

/** Resolve the Rubika chat guid for an internal conversation. */
export function rubikaGuidForConversation(conversationId: string): string | null {
  const conversation = conversations.find((c) => c.id === conversationId);
  if (!conversation) return null;
  return contacts.find((c) => c.id === conversation.contactId)?.rubikaId ?? null;
}
