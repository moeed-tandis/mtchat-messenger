import type { Contact, ContactNote } from "@/types";
import { ApiError, delay } from "../client";
import { contacts, conversations, uid } from "../mock/db";

/** GET /api/contacts */
export async function listContacts(query?: string): Promise<Contact[]> {
  await delay();
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return [...contacts];
  return contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.rubikaId.toLowerCase().includes(q),
  );
}

/** GET /api/contacts/:id */
export async function getContact(id: string): Promise<Contact> {
  await delay();
  const contact = contacts.find((c) => c.id === id);
  if (!contact) throw new ApiError("مخاطب یافت نشد.", "not_found");
  return contact;
}

export async function getContactConversations(contactId: string) {
  await delay();
  return conversations.filter((c) => c.contactId === contactId);
}

/** POST /api/contacts/:id/notes */
export async function addContactNote(
  contactId: string,
  authorId: string,
  body: string,
): Promise<ContactNote> {
  await delay(260);
  const contact = contacts.find((c) => c.id === contactId);
  if (!contact) throw new ApiError("مخاطب یافت نشد.", "not_found");
  const note: ContactNote = {
    id: uid("n"),
    authorId,
    body,
    createdAt: new Date().toISOString(),
  };
  contact.notes = [note, ...contact.notes];
  return note;
}
