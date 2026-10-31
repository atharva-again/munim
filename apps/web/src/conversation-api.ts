import { z } from "zod";
import {
  conversationSchema,
  voiceTokenSchema,
  type TransactionDraft,
} from "@munim/contracts";
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
  create: () =>
    requestJson("/api/conversations", sessionSchema, {
      method: "POST",
      body: "{}",
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
  form: (session: RecordingSession, draft: TransactionDraft, submit = false) =>
    requestJson(
      `/api/conversations/${session.conversation.id}/form`,
      conversationSchema,
      options(session, {
        draft,
        submit,
        revision: session.conversation.revision,
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
  voiceToken: (session: RecordingSession) =>
    requestJson(
      `/api/conversations/${session.conversation.id}/voice-token`,
      voiceTokenSchema,
      options(session, {}),
    ),
};
