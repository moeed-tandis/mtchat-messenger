import type { Contact, ContactNote } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { addContactNote as addContactNoteFn, updateContact } from "@/lib/conversations.functions";
import { ApiError } from "../client";

interface ContactRow {
  id: string;
  rubika_id: string;
  name: string;
  username: string | null;
  phone: string;
  avatar_url: string | null;
  first_contact_at: string;
  last_contact_at: string;
  assigned_user_id: string | null;
  last_active_agent_id: string | null;
  tags: string[];
  conversation_count: number;
  last_message_preview: string;
}

export interface ContactView extends Contact {
  username: string | null;
  avatarUrl: string | null;
}

function mapContact(row: ContactRow, notes: ContactNote[] = []): ContactView {
  return {
    id: row.id,
    rubikaId: row.rubika_id,
    name: row.name || row.rubika_id,
    username: row.username,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    firstContactAt: row.first_contact_at,
    lastContactAt: row.last_contact_at,
    assignedUserId: row.assigned_user_id,
    lastActiveAgentId: row.last_active_agent_id,
    tags: row.tags ?? [],
    notes,
    conversationCount: row.conversation_count,
    lastMessagePreview: row.last_message_preview,
  };
}

/** GET /api/contacts */
export async function listContacts(query?: string): Promise<ContactView[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("last_contact_at", { ascending: false })
    .limit(300);
  if (error) throw new ApiError("خواندن مخاطبان ناموفق بود.", error.code);
  const items = (data ?? []).map((row) => mapContact(row as unknown as ContactRow));
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.username ?? "").toLowerCase().includes(q) ||
      c.rubikaId.toLowerCase().includes(q),
  );
}

/** GET /api/contacts/:id */
export async function getContact(id: string): Promise<ContactView> {
  const [{ data, error }, { data: notes }] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("contact_notes")
      .select("id, author_id, body, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (error || !data) throw new ApiError("مخاطب یافت نشد.", "not_found");
  return mapContact(
    data as unknown as ContactRow,
    (notes ?? []).map((n) => ({
      id: n.id,
      authorId: n.author_id ?? "",
      body: n.body,
      createdAt: n.created_at,
    })),
  );
}

export async function getContactConversations(contactId: string) {
  const { data } = await supabase
    .from("conversations")
    .select("id, contact_id, assigned_user_id, status, unread_count, last_message_at, last_message_preview, created_at")
    .eq("contact_id", contactId)
    .order("last_message_at", { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    contactId: c.contact_id,
    assignedUserId: c.assigned_user_id,
    status: c.status,
    unreadCount: c.unread_count,
    lastMessageAt: c.last_message_at,
    lastMessagePreview: c.last_message_preview,
    createdAt: c.created_at,
  }));
}

/** POST /api/contacts/:id/notes */
export async function addContactNote(
  contactId: string,
  _authorId: string,
  body: string,
): Promise<ContactNote> {
  const result = await addContactNoteFn({ data: { contactId, body } });
  const note = result as unknown as { id: string; author_id: string | null; body: string; created_at: string };
  return {
    id: note.id,
    authorId: note.author_id ?? _authorId,
    body: note.body,
    createdAt: note.created_at,
  };
}

/** PATCH /api/contacts/:id */
export async function saveContact(
  contactId: string,
  patch: { name?: string; tags?: string[] },
): Promise<void> {
  await updateContact({ data: { contactId, ...patch } });
}
