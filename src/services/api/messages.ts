import type { Message } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { retryMessage as retryMessageFn, sendMessage as sendMessageFn } from "@/lib/conversations.functions";
import { ApiError } from "../client";
import { mapMessage } from "./conversations";

/** GET /api/conversations/:id/messages */
export async function listMessages(conversationId: string, limit = 100): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new ApiError("خواندن پیام‌ها ناموفق بود.", error.code);
  return (data ?? []).map((row) => mapMessage(row as never)).reverse();
}

export interface SendMessageInput {
  conversationId: string;
  text: string;
  authorUserId: string;
}

/** POST /api/conversations/:id/messages — queues the message for the Rubika worker. */
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  try {
    const result = await sendMessageFn({
      data: { conversationId: input.conversationId, text: input.text },
    });
    return mapMessage(result.message as never);
  } catch (error) {
    throw new ApiError(
      error instanceof Error && error.message === "bridge_offline"
        ? "اتصال روبیکا برقرار نیست."
        : "ارسال پیام ناموفق بود.",
      "send_failed",
    );
  }
}

/** POST /api/messages/:id/retry */
export async function retryMessage(messageId: string): Promise<Message> {
  const result = await retryMessageFn({ data: { messageId } });
  return mapMessage(result.message as never);
}
