import type { Contact, Conversation, Message } from "@/types";
import { delay } from "../client";
import { contacts, conversations, messages } from "../mock/db";

export interface GlobalSearchResults {
  contacts: Contact[];
  conversations: Array<Conversation & { contactName: string }>;
  messages: Array<Message & { contactName: string }>;
}

/** GET /api/search?q= */
export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  await delay(200);
  const q = query.trim().toLowerCase();
  if (!q) return { contacts: [], conversations: [], messages: [] };

  const matchedContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.rubikaId.toLowerCase().includes(q),
  );

  const contactName = (contactId: string) =>
    contacts.find((c) => c.id === contactId)?.name ?? "نامشخص";

  const matchedConversations = conversations
    .filter(
      (c) =>
        matchedContacts.some((mc) => mc.id === c.contactId) ||
        c.lastMessagePreview.toLowerCase().includes(q),
    )
    .map((c) => ({ ...c, contactName: contactName(c.contactId) }));

  const matchedMessages = messages
    .filter((m) => m.text.toLowerCase().includes(q))
    .slice(0, 12)
    .map((m) => {
      const conversation = conversations.find((c) => c.id === m.conversationId);
      return { ...m, contactName: conversation ? contactName(conversation.contactId) : "نامشخص" };
    });

  return {
    contacts: matchedContacts.slice(0, 8),
    conversations: matchedConversations.slice(0, 8),
    messages: matchedMessages,
  };
}
