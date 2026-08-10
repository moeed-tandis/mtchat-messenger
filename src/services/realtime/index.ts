import type { Message } from "@/types";
import { getBridgeState, ingestRubikaMessage } from "../api/rubika";
import { pushInboundMessage } from "../api/conversations";
import { pushNotification } from "../api/notifications";
import { contacts, conversations, uid } from "../mock/db";

/**
 * Realtime abstraction.
 *
 * Today it emits mock events on a timer. To connect a real backend,
 * replace `connect()` with a WebSocket/SSE client that dispatches the
 * same event names.
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

const INBOUND_SAMPLES = [
  "سلام، پیگیری درخواستم رو داشتم.",
  "ممنون میشم زودتر بررسی کنید.",
  "هنوز پاسخی دریافت نکردم.",
  "امکان تماس تلفنی هست؟",
  "مشکل برطرف شد، ممنون از پیگیری شما.",
];

class RealtimeService {
  private handlers = new Set<Handler>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private bridgeTimer: ReturnType<typeof setInterval> | null = null;
  private bridgeSeq = 0;
  private bridgeOnline = false;
  private refCount = 0;

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

  /** Simulates a message arriving from the external platform. */
  simulateInbound(conversationId?: string) {
    const open = conversations.filter((c) => c.status !== "CLOSED");
    const target = conversationId
      ? conversations.find((c) => c.id === conversationId)
      : open[Math.floor(Math.random() * open.length)];
    if (!target) return;
    const text = INBOUND_SAMPLES[Math.floor(Math.random() * INBOUND_SAMPLES.length)]!;
    const message = pushInboundMessage(target.id, text);
    if (!message) return;
    const contactName = contacts.find((c) => c.id === target.contactId)?.name ?? "مخاطب";
    pushNotification({
      id: uid("nt"),
      title: `پیام جدید از ${contactName}`,
      body: text,
      createdAt: message.createdAt,
      read: false,
      conversationId: target.id,
    });
    this.emit({ type: "message.created", payload: message });
    this.emit({ type: "conversation.updated", payload: { conversationId: target.id } });
  }

  /** True while the Rubika worker is delivering real messages. */
  isBridgeOnline() {
    return this.bridgeOnline;
  }

  /** Pulls real Rubika messages from the server bridge and ingests them. */
  private async pollBridge() {
    try {
      const { status, messages } = await getBridgeState(this.bridgeSeq);
      this.bridgeOnline = status.state === "CONNECTED";
      for (const item of messages) {
        this.bridgeSeq = Math.max(this.bridgeSeq, item.seq);
        const message = ingestRubikaMessage(item);
        if (!message) continue;
        this.emit({ type: "message.created", payload: message });
        this.emit({
          type: "conversation.updated",
          payload: { conversationId: message.conversationId },
        });
      }
    } catch {
      this.bridgeOnline = false;
    }
  }

  private connect() {
    if (this.timer || typeof window === "undefined") return;
    // Real transport: polls the server bridge fed by the rubpy worker.
    void this.pollBridge();
    this.bridgeTimer = setInterval(() => void this.pollBridge(), 3_000);
    // Demo transport: only fires while no real Rubika account is connected.
    this.timer = setInterval(() => {
      if (!this.bridgeOnline) this.simulateInbound();
    }, 45_000);
  }

  private disconnect() {
    if (this.timer) clearInterval(this.timer);
    if (this.bridgeTimer) clearInterval(this.bridgeTimer);
    this.timer = null;
    this.bridgeTimer = null;
  }
}

export const realtime = new RealtimeService();
