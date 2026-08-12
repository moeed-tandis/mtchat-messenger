import type { Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { mapMessage } from "../api/conversations";
import { pushNotification } from "../api/notifications";

/**
 * Realtime transport backed by Postgres change streams.
 * Every event below is produced by real database activity.
 */

export type RealtimeEvent =
  | { type: "message.created"; payload: Message }
  | { type: "message.updated"; payload: Message }
  | { type: "message.failed"; payload: Message }
  | { type: "conversation.created"; payload: { conversationId: string } }
  | { type: "conversation.updated"; payload: { conversationId: string } }
  | { type: "conversation.assigned"; payload: { conversationId: string; userId: string } }
  | { type: "user.online"; payload: { userId: string } }
  | { type: "user.offline"; payload: { userId: string } };

type Handler = (event: RealtimeEvent) => void;

class RealtimeService {
  private handlers = new Set<Handler>();
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private refCount = 0;
  private online = false;

  subscribe(handler: Handler) {
    this.handlers.add(handler);
    this.refCount += 1;
    this.connect();
    return () => {
      this.handlers.delete(handler);
      this.refCount -= 1;
      if (this.refCount <= 0) this.disconnect();
    };
  }

  emit(event: RealtimeEvent) {
    this.handlers.forEach((handler) => handler(event));
  }

  /** True while the realtime channel is joined. */
  isBridgeOnline() {
    return this.online;
  }

  private async notify(message: Message) {
    const { data } = await supabase
      .from("conversations")
      .select("contacts:contact_id(name)")
      .eq("id", message.conversationId)
      .maybeSingle();
    const contact = data?.contacts as unknown as { name: string } | null;
    pushNotification({
      id: `nt_${message.id}`,
      title: `پیام جدید از ${contact?.name || "مخاطب"}`,
      body: message.text,
      createdAt: message.createdAt,
      read: false,
      conversationId: message.conversationId,
    });
  }

  private connect() {
    if (this.channel || typeof window === "undefined") return;
    this.channel = supabase
      .channel("mtchat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const message = mapMessage(payload.new as never);
        this.emit({ type: "message.created", payload: message });
        this.emit({
          type: "conversation.updated",
          payload: { conversationId: message.conversationId },
        });
        if (message.direction === "INBOUND") void this.notify(message);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, (payload) => {
        const message = mapMessage(payload.new as never);
        this.emit({
          type: message.status === "FAILED" ? "message.failed" : "message.updated",
          payload: message,
        });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        (payload) => {
          const row = (payload.new ?? payload.old) as { id?: string } | null;
          if (!row?.id) return;
          this.emit({
            type: payload.eventType === "INSERT" ? "conversation.created" : "conversation.updated",
            payload: { conversationId: row.id },
          });
        },
      )
      .subscribe((status) => {
        this.online = status === "SUBSCRIBED";
      });
  }

  private disconnect() {
    if (this.channel) void supabase.removeChannel(this.channel);
    this.channel = null;
    this.online = false;
  }
}

export const realtime = new RealtimeService();
