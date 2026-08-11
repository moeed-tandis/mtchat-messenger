import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

/** Sends a reply: stores it, queues it for Rubika, and logs the attempt. */
export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        conversationId: uuid,
        text: z.string().trim().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, isSuperAdmin, logMessage, queueOutbound } = await import(
      "@/lib/mtchat.server"
    );

    const { data: conversation, error: convError } = await admin
      .from("conversations")
      .select("*, contacts(*)")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (convError) throw convError;
    if (!conversation) throw new Error("گفتگو یافت نشد.");
    if (conversation.assigned_user_id !== context.userId && !(await isSuperAdmin(context.userId))) {
      throw new Error("این گفتگو به شما اختصاص داده نشده است.");
    }

    const contact = conversation.contacts as { id: string; name: string; rubika_id: string } | null;
    const now = new Date().toISOString();

    const { data: message, error } = await admin
      .from("messages")
      .insert({
        conversation_id: data.conversationId,
        direction: "OUTBOUND",
        type: "text",
        text: data.text,
        author_user_id: context.userId,
        status: "PENDING",
        created_at: now,
      })
      .select("*")
      .single();
    if (error) throw error;

    const { data: bridge } = await admin
      .from("bridge_state")
      .select("state")
      .eq("id", 1)
      .maybeSingle();
    const bridgeOnline = bridge?.state === "CONNECTED";

    if (contact?.rubika_id) await queueOutbound(contact.rubika_id, data.text);

    const status = bridgeOnline ? "SENT" : "PENDING";
    await admin.from("messages").update({ status }).eq("id", message.id);

    await admin
      .from("conversations")
      .update({
        last_message_at: now,
        last_message_preview: data.text,
        assigned_user_id: conversation.assigned_user_id ?? context.userId,
        status: conversation.status === "CLOSED" ? "OPEN" : conversation.status,
      })
      .eq("id", data.conversationId);

    if (contact) {
      await admin
        .from("contacts")
        .update({
          last_active_agent_id: context.userId,
          last_contact_at: now,
          last_message_preview: data.text,
        })
        .eq("id", contact.id);
    }

    await admin
      .from("bridge_state")
      .update({ outbound_count: await nextOutbound(admin) })
      .eq("id", 1);

    await logMessage({
      messageId: message.id,
      conversationId: data.conversationId,
      contactName: contact?.name ?? "",
      direction: "OUTBOUND",
      status: bridgeOnline ? "SUCCESS" : "PENDING",
      payload: {
        conversationId: data.conversationId,
        chatGuid: contact?.rubika_id,
        text: data.text,
        queued: true,
      },
    });

    return { ...message, status };
  });

async function nextOutbound(admin: { from: (t: "bridge_state") => never }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = admin as any;
  const { data } = await client.from("bridge_state").select("outbound_count").eq("id", 1).maybeSingle();
  return (data?.outbound_count ?? 0) + 1;
}

/** Re-queues a failed or pending outbound message. */
export const retryMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ messageId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, isSuperAdmin, queueOutbound } = await import("@/lib/mtchat.server");
    const { data: message } = await admin
      .from("messages")
      .select("*, conversations(assigned_user_id, contact_id, contacts(rubika_id))")
      .eq("id", data.messageId)
      .maybeSingle();
    if (!message) throw new Error("پیام یافت نشد.");
    const conversation = message.conversations as {
      assigned_user_id: string | null;
      contacts: { rubika_id: string } | null;
    } | null;
    if (conversation?.assigned_user_id !== context.userId && !(await isSuperAdmin(context.userId))) {
      throw new Error("دسترسی مجاز نیست.");
    }
    await admin.from("messages").update({ status: "PENDING" }).eq("id", data.messageId);
    if (conversation?.contacts?.rubika_id) {
      await queueOutbound(conversation.contacts.rubika_id, message.text);
    }
    return { ok: true };
  });

/** Changes conversation status (owner or super admin). */
export const setConversationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ conversationId: uuid, status: z.enum(["OPEN", "PENDING", "CLOSED"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, isSuperAdmin, logAudit } = await import("@/lib/mtchat.server");
    const { data: conversation } = await admin
      .from("conversations")
      .select("assigned_user_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conversation) throw new Error("گفتگو یافت نشد.");
    if (conversation.assigned_user_id !== context.userId && !(await isSuperAdmin(context.userId))) {
      throw new Error("دسترسی مجاز نیست.");
    }
    await admin.from("conversations").update({ status: data.status }).eq("id", data.conversationId);
    const label =
      data.status === "CLOSED" ? "گفتگو را بست" : data.status === "PENDING" ? "گفتگو را به انتظار منتقل کرد" : "گفتگو را باز کرد";
    await logAudit(context.userId, label);
    return { ok: true };
  });

/** Assigns a conversation to an agent (super admin only). */
export const assignConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ conversationId: uuid, userId: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, requireSuperAdmin, logAudit, profileName } = await import(
      "@/lib/mtchat.server"
    );
    await requireSuperAdmin(context.userId);
    const { data: conversation } = await admin
      .from("conversations")
      .select("contact_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conversation) throw new Error("گفتگو یافت نشد.");
    await admin
      .from("conversations")
      .update({ assigned_user_id: data.userId })
      .eq("id", data.conversationId);
    await admin
      .from("contacts")
      .update({ assigned_user_id: data.userId })
      .eq("id", conversation.contact_id);
    await logAudit(
      context.userId,
      `گفتگو را به ${await profileName(data.userId)} اختصاص داد`,
    );
    return { ok: true };
  });

/** Marks a conversation as read and its inbound messages as READ. */
export const markConversationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conversationId: uuid }).parse(input))
  .handler(async ({ data, context }) => {
    const { admin, isSuperAdmin } = await import("@/lib/mtchat.server");
    const { data: conversation } = await admin
      .from("conversations")
      .select("assigned_user_id")
      .eq("id", data.conversationId)
      .maybeSingle();
    if (!conversation) return { ok: false };
    if (conversation.assigned_user_id !== context.userId && !(await isSuperAdmin(context.userId))) {
      return { ok: false };
    }
    await admin.from("conversations").update({ unread_count: 0 }).eq("id", data.conversationId);
    await admin
      .from("messages")
      .update({ status: "READ" })
      .eq("conversation_id", data.conversationId)
      .eq("direction", "INBOUND")
      .neq("status", "READ");
    return { ok: true };
  });

/** Adds an internal note to a contact. */
export const addContactNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ contactId: uuid, body: z.string().trim().min(1).max(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, isSuperAdmin } = await import("@/lib/mtchat.server");
    const { data: allowed } = await admin
      .from("conversations")
      .select("id")
      .eq("contact_id", data.contactId)
      .eq("assigned_user_id", context.userId)
      .limit(1);
    if (!allowed?.length && !(await isSuperAdmin(context.userId))) {
      throw new Error("دسترسی مجاز نیست.");
    }
    const { data: note, error } = await admin
      .from("contact_notes")
      .insert({ contact_id: data.contactId, author_id: context.userId, body: data.body })
      .select("*")
      .single();
    if (error) throw error;
    return note;
  });

/** Updates editable contact fields (tags / display name). */
export const updateContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        contactId: uuid,
        name: z.string().trim().min(1).max(80).optional(),
        tags: z.array(z.string().trim().min(1).max(24)).max(12).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { admin, isSuperAdmin } = await import("@/lib/mtchat.server");
    const { data: allowed } = await admin
      .from("conversations")
      .select("id")
      .eq("contact_id", data.contactId)
      .eq("assigned_user_id", context.userId)
      .limit(1);
    if (!allowed?.length && !(await isSuperAdmin(context.userId))) {
      throw new Error("دسترسی مجاز نیست.");
    }
    const patch: { name?: string; tags?: string[] } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.tags !== undefined) patch.tags = data.tags;
    const { error } = await admin.from("contacts").update(patch).eq("id", data.contactId);
    if (error) throw error;
    return { ok: true };
  });
