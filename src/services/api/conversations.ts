import type { Conversation, ConversationStatus, Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import {
  assignConversation as assignConversationFn,
  markConversationRead as markConversationReadFn,
  setConversationStatus,
} from "@/lib/conversations.functions";
import { ApiError } from "../client";

export interface ConversationListItem extends Conversation {
  contactName: string;
  contactPhone: string;
  contactRubikaId: string;
  contactAvatarUrl: string | null;
  assignedUserName: string | null;
}

export interface ConversationFilters {
  scope?: "ALL" | "MINE" | "UNREAD" | "OPEN" | "PENDING" | "CLOSED";
  query?: string;
  currentUserId?: string;
  /** Agents only see their own conversations (also enforced by RLS). */
  restrictToUserId?: string;
}

interface Row {
  id: string;
  contact_id: string;
  assigned_user_id: string | null;
  status: ConversationStatus;
  unread_count: number;
  last_message_at: string;
  last_message_preview: string;
  created_at: string;
  contacts: {
    name: string;
    phone: string;
    rubika_id: string;
    avatar_url: string | null;
  } | null;
  profiles: { full_name: string } | null;
}

const SELECT =
  "id, contact_id, assigned_user_id, status, unread_count, last_message_at, last_message_preview, created_at, contacts:contact_id(name, phone, rubika_id, avatar_url), profiles:assigned_user_id(full_name)";

function mapRow(row: Row): ConversationListItem {
  return {
    id: row.id,
    contactId: row.contact_id,
    assignedUserId: row.assigned_user_id,
    status: row.status,
    unreadCount: row.unread_count,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
    createdAt: row.created_at,
    contactName: row.contacts?.name || "نامشخص",
    contactPhone: row.contacts?.phone ?? "",
    contactRubikaId: row.contacts?.rubika_id ?? "",
    contactAvatarUrl: row.contacts?.avatar_url ?? null,
    assignedUserName: row.profiles?.full_name ?? null,
  };
}

/** GET /api/conversations */
export async function listConversations(
  filters: ConversationFilters = {},
): Promise<ConversationListItem[]> {
  let query = supabase
    .from("conversations")
    .select(SELECT)
    .order("last_message_at", { ascending: false })
    .limit(200);

  if (filters.restrictToUserId) query = query.eq("assigned_user_id", filters.restrictToUserId);

  switch (filters.scope) {
    case "MINE":
      if (filters.currentUserId) query = query.eq("assigned_user_id", filters.currentUserId);
      break;
    case "UNREAD":
      query = query.gt("unread_count", 0);
      break;
    case "OPEN":
    case "PENDING":
    case "CLOSED":
      query = query.eq("status", filters.scope);
      break;
    default:
      break;
  }

  const { data, error } = await query;
  if (error) throw new ApiError("خواندن گفتگوها ناموفق بود.", error.code);
  let items = ((data ?? []) as unknown as Row[]).map(mapRow);

  const q = (filters.query ?? "").trim().toLowerCase();
  if (q) {
    items = items.filter(
      (c) =>
        c.contactName.toLowerCase().includes(q) ||
        c.contactPhone.includes(q) ||
        c.contactRubikaId.toLowerCase().includes(q) ||
        c.lastMessagePreview.toLowerCase().includes(q),
    );
  }
  return items;
}

/** GET /api/conversations/:id */
export async function getConversation(id: string): Promise<ConversationListItem> {
  const { data, error } = await supabase.from("conversations").select(SELECT).eq("id", id).maybeSingle();
  if (error || !data) throw new ApiError("گفتگو یافت نشد.", "not_found");
  return mapRow(data as unknown as Row);
}

/** PATCH /api/conversations/:id */
export async function updateConversationStatus(
  id: string,
  status: ConversationStatus,
): Promise<ConversationListItem> {
  await setConversationStatus({ data: { conversationId: id, status } });
  return getConversation(id);
}

/** POST /api/conversations/:id/assign */
export async function assignConversation(
  id: string,
  userId: string,
): Promise<ConversationListItem> {
  await assignConversationFn({ data: { conversationId: id, userId } });
  return getConversation(id);
}

/** POST /api/conversations/:id/read */
export async function markConversationRead(id: string): Promise<void> {
  await markConversationReadFn({ data: { conversationId: id } });
}

interface MessageRow {
  id: string;
  conversation_id: string;
  external_message_id: string | null;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  text: string;
  author_user_id: string | null;
  status: Message["status"];
  created_at: string;
}

export function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    externalMessageId: row.external_message_id ?? undefined,
    direction: row.direction,
    type: (row.type as Message["type"]) ?? "text",
    text: row.text,
    authorUserId: row.author_user_id,
    status: row.status,
    createdAt: row.created_at,
  };
}
