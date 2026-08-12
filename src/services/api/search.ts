import type { Contact, Conversation, Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { mapMessage } from "./conversations";

export interface GlobalSearchResults {
  contacts: Contact[];
  conversations: Array<Conversation & { contactName: string }>;
  messages: Array<Message & { contactName: string }>;
}

/** GET /api/search?q= */
export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  const q = query.trim();
  if (!q) return { contacts: [], conversations: [], messages: [] };

  const [contactsRes, conversationsRes, messagesRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .or(`name.ilike.%${q}%,phone.ilike.%${q}%,rubika_id.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(8),
    supabase
      .from("conversations")
      .select(
        "id, contact_id, assigned_user_id, status, unread_count, last_message_at, last_message_preview, created_at, contacts:contact_id(name)",
      )
      .or(`last_message_preview.ilike.%${q}%`)
      .order("last_message_at", { ascending: false })
      .limit(8),
    supabase
      .from("messages")
      .select("*, conversations:conversation_id(contacts:contact_id(name))")
      .ilike("text", `%${q}%`)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return {
    contacts: (contactsRes.data ?? []).map((c) => ({
      id: c.id,
      rubikaId: c.rubika_id,
      name: c.name || c.rubika_id,
      phone: c.phone,
      firstContactAt: c.first_contact_at,
      lastContactAt: c.last_contact_at,
      assignedUserId: c.assigned_user_id,
      lastActiveAgentId: c.last_active_agent_id,
      tags: c.tags ?? [],
      notes: [],
      conversationCount: c.conversation_count,
      lastMessagePreview: c.last_message_preview,
    })),
    conversations: (conversationsRes.data ?? []).map((c) => ({
      id: c.id,
      contactId: c.contact_id,
      assignedUserId: c.assigned_user_id,
      status: c.status,
      unreadCount: c.unread_count,
      lastMessageAt: c.last_message_at,
      lastMessagePreview: c.last_message_preview,
      createdAt: c.created_at,
      contactName: (c.contacts as unknown as { name: string } | null)?.name || "نامشخص",
    })),
    messages: (messagesRes.data ?? []).map((m) => {
      const conversation = m.conversations as unknown as { contacts: { name: string } | null } | null;
      return {
        ...mapMessage(m as never),
        contactName: conversation?.contacts?.name || "نامشخص",
      };
    }),
  };
}
