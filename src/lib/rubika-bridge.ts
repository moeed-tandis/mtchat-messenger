/**
 * In-memory state shared between the Rubika worker (rubpy) and the panel.
 *
 * The worker is a long running process that owns the real Rubika account
 * session. It talks to the panel through the HTTP endpoints in
 * `src/routes/api/public/rubika/*` and `src/routes/api/rubika/*`.
 *
 * NOTE: this store lives in the server process memory. Swap the four
 * functions below for a database (Lovable Cloud) when you need durability
 * across deploys / multiple instances.
 */

export type BridgeState =
  | "OFFLINE"
  | "CONNECTING"
  | "AWAITING_PHONE"
  | "AWAITING_CODE"
  | "AWAITING_PASSWORD"
  | "CONNECTED"
  | "ERROR";

export interface RubikaInbound {
  seq: number;
  chatGuid: string;
  chatTitle: string;
  authorGuid: string;
  messageId: string;
  type: string;
  text: string;
  fileName?: string;
  fileUrl?: string;
  isMe: boolean;
  createdAt: string;
}

export interface RubikaOutboundJob {
  id: string;
  chatGuid: string;
  text: string;
  createdAt: string;
}

export interface RubikaCommand {
  id: string;
  type: "login" | "code" | "password" | "logout" | "refresh_chats";
  value?: string;
  createdAt: string;
}

export interface RubikaChat {
  guid: string;
  title: string;
  phone?: string;
}

interface BridgeStore {
  state: BridgeState;
  guid: string | null;
  phone: string | null;
  error: string | null;
  lastHeartbeatAt: string | null;
  seq: number;
  inbound: RubikaInbound[];
  outbox: RubikaOutboundJob[];
  commands: RubikaCommand[];
  chats: RubikaChat[];
  counters: { inbound: number; outbound: number };
}

const g = globalThis as unknown as { __mtchatRubika?: BridgeStore };

export function store(): BridgeStore {
  if (!g.__mtchatRubika) {
    g.__mtchatRubika = {
      state: "OFFLINE",
      guid: null,
      phone: null,
      error: null,
      lastHeartbeatAt: null,
      seq: 0,
      inbound: [],
      outbox: [],
      commands: [],
      chats: [],
      counters: { inbound: 0, outbound: 0 },
    };
  }
  return g.__mtchatRubika;
}

const MAX_INBOUND = 500;

export function addInbound(items: Omit<RubikaInbound, "seq">[]): number {
  const s = store();
  for (const item of items) {
    s.seq += 1;
    s.inbound.push({ ...item, seq: s.seq });
    if (!item.isMe) s.counters.inbound += 1;
  }
  if (s.inbound.length > MAX_INBOUND) s.inbound.splice(0, s.inbound.length - MAX_INBOUND);
  return s.seq;
}

export function inboundSince(since: number): RubikaInbound[] {
  return store().inbound.filter((m) => m.seq > since);
}

export function enqueueOutbound(chatGuid: string, text: string): RubikaOutboundJob {
  const s = store();
  const job: RubikaOutboundJob = {
    id: `out_${s.seq}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    chatGuid,
    text,
    createdAt: new Date().toISOString(),
  };
  s.outbox.push(job);
  s.counters.outbound += 1;
  return job;
}

export function enqueueCommand(type: RubikaCommand["type"], value?: string): RubikaCommand {
  const s = store();
  const command: RubikaCommand = {
    id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    createdAt: new Date().toISOString(),
    ...(value ? { value } : {}),
  };
  s.commands.push(command);
  return command;
}

/** Worker pulls (and clears) everything it must act on. */
export function drainWork() {
  const s = store();
  const messages = s.outbox.splice(0, s.outbox.length);
  const commands = s.commands.splice(0, s.commands.length);
  s.lastHeartbeatAt = new Date().toISOString();
  return { messages, commands };
}

export function setStatus(patch: {
  state?: BridgeState;
  guid?: string | null;
  phone?: string | null;
  error?: string | null;
  chats?: RubikaChat[];
}) {
  const s = store();
  if (patch.state) s.state = patch.state;
  if (patch.guid !== undefined) s.guid = patch.guid;
  if (patch.phone !== undefined) s.phone = patch.phone;
  if (patch.error !== undefined) s.error = patch.error;
  if (patch.chats) s.chats = patch.chats.slice(0, 200);
  s.lastHeartbeatAt = new Date().toISOString();
}

export function publicStatus() {
  const s = store();
  return {
    state: s.state,
    guid: s.guid,
    phone: s.phone,
    error: s.error,
    lastHeartbeatAt: s.lastHeartbeatAt,
    pendingOutbound: s.outbox.length,
    chats: s.chats,
    counters: s.counters,
    seq: s.seq,
  };
}

/** Constant-time-ish comparison for the shared worker secret. */
export function secretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided || provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
