import { z } from "zod";
import { conversationSchema, voiceTokenSchema } from "@munim/contracts";
import { requestJson } from "./http";
export const sessionSchema = z.object({
  conversation: conversationSchema,
  token: z.string(),
  textConfigured: z.boolean(),
  voiceConfigured: z.boolean(),
});
export type RecordingSession = z.infer<typeof sessionSchema>;
function options(session: RecordingSession, body?: unknown): RequestInit {
  return {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${session.token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  };
}
export const conversations = {
  telemetry: (
    session: RecordingSession,
    data: { stage: "client_audio_gap"; durationMs: number; turnId?: string },
  ) =>
    requestJson(
      `/api/conversations/${session.conversation.id}/telemetry`,
      z.object({ ok: z.boolean() }),
      options(session, data),
    ),
  create: (purpose: "agent" | "record" = "agent") =>
    requestJson("/api/conversations", sessionSchema, {
      method: "POST",
      body: JSON.stringify({ purpose }),
    }),
  get: (session: RecordingSession) =>
    requestJson(
      `/api/conversations/${session.conversation.id}`,
      conversationSchema,
      options(session),
    ),
  turn: (session: RecordingSession, text: string, requestId: string) =>
    requestJson(
      `/api/conversations/${session.conversation.id}/turn`,
      conversationSchema,
      options(session, {
        text,
        requestId,
        revision: session.conversation.revision,
        channel: "text",
      }),
    ),
  reviewed: (session: RecordingSession) =>
    requestJson(
      `/api/conversations/${session.conversation.id}/reviewed`,
      conversationSchema,
      options(session, {
        revision: session.conversation.revision,
        channel: "screen",
      }),
    ),
  confirm: (session: RecordingSession) =>
    requestJson(
      `/api/conversations/${session.conversation.id}/confirm`,
      conversationSchema,
      options(session, { revision: session.conversation.revision }),
    ),
  voiceToken: (session: RecordingSession, signal?: AbortSignal) =>
    requestJson(
      `/api/conversations/${session.conversation.id}/voice-token`,
      voiceTokenSchema,
      { ...options(session, {}), signal },
    ),
};
