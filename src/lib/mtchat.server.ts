/**
 * Server-only MTchat helpers (service-role access).
 * Never import this from client code — always `await import()` it inside a
 * server function handler or a server route handler.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const admin = supabaseAdmin;

export const USER_EMAIL_DOMAIN = "mtchat.app";

export function emailForUsername(username: string) {
  return `${username.trim().toLowerCase()}@${USER_EMAIL_DOMAIN}`;
}

export async function isSuperAdmin(userId: string) {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "SUPER_ADMIN")
    .maybeSingle();
  return Boolean(data);
}

export async function requireSuperAdmin(userId: string) {
  if (!(await isSuperAdmin(userId))) throw new Error("Forbidden: super admin only");
}

export async function profileName(userId: string | null | undefined) {
  if (!userId) return "سیستم";
  const { data } = await admin.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  return data?.full_name ?? "کاربر";
}

export async function logAudit(userId: string | null, action: string, ip = "") {
  await admin.from("audit_logs").insert({
    user_id: userId,
    user_name: await profileName(userId),
    action,
    ip,
  });
}

export async function logSecurity(event: string, userName: string, detail: string, ip = "") {
  await admin.from("security_logs").insert({ event, user_name: userName, detail, ip });
}

export async function logSystem(
  event: string,
  opts: { level?: string; service?: string; status?: string } = {},
) {
  await admin.from("system_logs").insert({
    event,
    level: opts.level ?? "INFO",
    service: opts.service ?? "app",
    status: opts.status ?? "OK",
  });
}

export async function logMessage(input: {
  messageId?: string | null;
  conversationId?: string | null;
  contactName?: string;
  direction: "INBOUND" | "OUTBOUND";
  status: "SUCCESS" | "PENDING" | "FAILED";
  payload: Record<string, unknown>;
}) {
  await admin.from("message_logs").insert({
    message_id: input.messageId ?? null,
    conversation_id: input.conversationId ?? null,
    contact_name: input.contactName ?? "",
    direction: input.direction,
    status: input.status,
    payload: input.payload as never,
  });
}

/** Reads a JSON settings blob. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await admin.from("app_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T | undefined) ?? fallback;
}

export async function setSetting(key: string, value: unknown) {
  await admin
    .from("app_settings")
    .upsert({ key, value: value as never, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

/** Token the Rubika connector worker uses to authenticate against this app. */
export async function getBridgeToken(): Promise<string> {
  const current = await getSetting<{ token?: string }>("bridge", {});
  if (current.token) return current.token;
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await setSetting("bridge", { ...current, token });
  return token;
}

export async function rotateBridgeToken(): Promise<string> {
  const current = await getSetting<Record<string, unknown>>("bridge", {});
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  await setSetting("bridge", { ...current, token });
  return token;
}

export async function assertBridgeToken(request: Request) {
  const provided =
    request.headers.get("x-bridge-token") ??
    request.headers.get("x-bridge-secret") ??
    new URL(request.url).searchParams.get("token") ??
    "";
  const expected = await getBridgeToken();
  if (!provided || provided !== expected) throw new Response("Unauthorized", { status: 401 });
}


export interface RoutingSettingsValue {
  useLastActiveAgent: boolean;
  fallbackUserId: string | null;
  autoAssign: boolean;
}

export const DEFAULT_ROUTING: RoutingSettingsValue = {
  useLastActiveAgent: true,
  fallbackUserId: null,
  autoAssign: true,
};

/**
 * Routing: explicit rule (phone) → last active agent → configured fallback →
 * least loaded active agent.
 */
export async function pickAgent(input: {
  phone?: string | null;
  lastActiveAgentId?: string | null;
}): Promise<string | null> {
  const settings = { ...DEFAULT_ROUTING, ...(await getSetting("routing", DEFAULT_ROUTING)) };
  if (!settings.autoAssign) return null;

  if (input.phone) {
    const { data: rule } = await admin
      .from("routing_rules")
      .select("user_id")
      .eq("phone", input.phone)
      .maybeSingle();
    if (rule?.user_id && (await isAssignable(rule.user_id))) return rule.user_id;
  }

  if (settings.useLastActiveAgent && input.lastActiveAgentId) {
    if (await isAssignable(input.lastActiveAgentId)) return input.lastActiveAgentId;
  }

  if (settings.fallbackUserId && (await isAssignable(settings.fallbackUserId))) {
    return settings.fallbackUserId;
  }

  const { data: agents } = await admin
    .from("profiles")
    .select("id")
    .eq("status", "ACTIVE");
  if (!agents?.length) return null;

  const { data: roles } = await admin.from("user_roles").select("user_id, role");
  const agentIds = agents
    .map((a) => a.id)
    .filter((id) => roles?.some((r) => r.user_id === id && r.role === "AGENT"));
  if (!agentIds.length) return null;

  const { data: open } = await admin
    .from("conversations")
    .select("assigned_user_id")
    .neq("status", "CLOSED");
  const load = new Map(agentIds.map((id) => [id, 0]));
  open?.forEach((c) => {
    if (c.assigned_user_id && load.has(c.assigned_user_id)) {
      load.set(c.assigned_user_id, (load.get(c.assigned_user_id) ?? 0) + 1);
    }
  });
  return [...load.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
}

async function isAssignable(userId: string) {
  const { data } = await admin
    .from("profiles")
    .select("id, status")
    .eq("id", userId)
    .maybeSingle();
  return data?.status === "ACTIVE";
}

/** Queues an outbound payload for the Rubika connector worker. */
export async function queueOutbound(chatGuid: string, text: string) {
  await admin.from("bridge_outbox").insert({ kind: "send", chat_guid: chatGuid, text });
}

export async function queueCommand(type: string, value?: string | null) {
  await admin
    .from("bridge_outbox")
    .insert({ kind: "command", command_type: type, command_value: value ?? null });
}

export interface InboundPayload {
  chatGuid: string;
  chatTitle?: string | undefined;
  username?: string | null | undefined;
  phone?: string | null | undefined;
  avatarUrl?: string | null | undefined;
  messageId?: string | null | undefined;
  type?: string | undefined;
  text?: string | undefined;
  fileName?: string | null | undefined;
  isMe?: boolean | undefined;
  createdAt?: string | undefined;
}


/**
 * Maps a raw Rubika chat + message into the internal contact / conversation /
 * message model, assigning an agent on first contact.
 */
export async function ingestInbound(item: InboundPayload) {
  const createdAt = item.createdAt ?? new Date().toISOString();
  const text = item.text?.trim() || (item.fileName ? `📎 ${item.fileName}` : `[${item.type ?? "media"}]`);

  const { data: existing } = await admin
    .from("contacts")
    .select("*")
    .eq("rubika_id", item.chatGuid)
    .maybeSingle();

  let contact = existing;
  if (!contact) {
    const assigned = await pickAgent({ phone: item.phone ?? null, lastActiveAgentId: null });
    const { data: created, error } = await admin
      .from("contacts")
      .insert({
        rubika_id: item.chatGuid,
        name: item.chatTitle || item.username || item.chatGuid,
        username: item.username ?? null,
        phone: item.phone ?? "",
        avatar_url: item.avatarUrl ?? null,
        first_contact_at: createdAt,
        last_contact_at: createdAt,
        assigned_user_id: assigned,
        last_active_agent_id: null,
        tags: ["روبیکا"],
        last_message_preview: text,
      })
      .select("*")
      .single();
    if (error) throw error;
    contact = created;
  } else {
    await admin
      .from("contacts")
      .update({
        name: item.chatTitle || contact.name,
        username: item.username ?? contact.username,
        phone: item.phone || contact.phone,
        avatar_url: item.avatarUrl ?? contact.avatar_url,
        last_contact_at: createdAt,
        last_message_preview: text,
      })
      .eq("id", contact.id);
  }

  const { data: openConversation } = await admin
    .from("conversations")
    .select("*")
    .eq("contact_id", contact.id)
    .neq("status", "CLOSED")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversation = openConversation;
  if (!conversation) {
    const assigned =
      contact.assigned_user_id ??
      (await pickAgent({ phone: contact.phone, lastActiveAgentId: contact.last_active_agent_id }));
    const { data: created, error } = await admin
      .from("conversations")
      .insert({
        contact_id: contact.id,
        assigned_user_id: assigned,
        status: "OPEN",
        unread_count: 0,
        last_message_at: createdAt,
        last_message_preview: text,
      })
      .select("*")
      .single();
    if (error) throw error;
    conversation = created;
    await admin
      .from("contacts")
      .update({
        conversation_count: (contact.conversation_count ?? 0) + 1,
        assigned_user_id: assigned,
      })
      .eq("id", contact.id);
  }

  if (item.isMe) {
    // Message sent from the linked Rubika account outside the panel.
    const { data: message } = await admin
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        external_message_id: item.messageId ?? null,
        direction: "OUTBOUND",
        type: item.type ?? "text",
        text,
        file_name: item.fileName ?? null,
        status: "SENT",
        created_at: createdAt,
      })
      .select("id")
      .single();
    await admin
      .from("conversations")
      .update({ last_message_at: createdAt, last_message_preview: text })
      .eq("id", conversation.id);
    return { conversationId: conversation.id, messageId: message?.id ?? null };
  }

  const duplicate = item.messageId
    ? await admin
        .from("messages")
        .select("id")
        .eq("conversation_id", conversation.id)
        .eq("external_message_id", item.messageId)
        .maybeSingle()
    : { data: null };
  if (duplicate.data) return { conversationId: conversation.id, messageId: duplicate.data.id };

  const { data: message, error: messageError } = await admin
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      external_message_id: item.messageId ?? null,
      direction: "INBOUND",
      type: item.type ?? "text",
      text,
      file_name: item.fileName ?? null,
      status: "SENT",
      created_at: createdAt,
    })
    .select("id")
    .single();
  if (messageError) throw messageError;

  await admin
    .from("conversations")
    .update({
      last_message_at: createdAt,
      last_message_preview: text,
      unread_count: (conversation.unread_count ?? 0) + 1,
      status: conversation.status === "CLOSED" ? "OPEN" : conversation.status,
    })
    .eq("id", conversation.id);

  await logMessage({
    messageId: message.id,
    conversationId: conversation.id,
    contactName: contact.name,
    direction: "INBOUND",
    status: "SUCCESS",
    payload: {
      externalMessageId: item.messageId,
      contact: { guid: item.chatGuid, username: item.username, phone: item.phone },
      message: { type: item.type ?? "text", text, timestamp: createdAt },
    },
  });

  return { conversationId: conversation.id, messageId: message.id };
}
