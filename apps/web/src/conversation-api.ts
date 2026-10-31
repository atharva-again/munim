import { z } from "zod";
import {
  conversationSchema,
  voiceTokenSchema,
  type TransactionDraft,
} from "@munim/contracts";
export const sessionSchema = z.object({
  conversation: conversationSchema,
  token: z.string(),
  textConfigured: z.boolean(),
  voiceConfigured: z.boolean(),
});
export type RecordingSession = z.infer<typeof sessionSchema>;
async function request(path: string, token?: string, body?: unknown) {
  const response = await fetch(`/api/conversations${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const value: unknown = await response.json();
  if (!response.ok) {
    const parsed = z.object({ error: z.string() }).safeParse(value);
    throw new Error(
      parsed.success ? parsed.data.error : "Could not complete the request.",
    );
  }
  return value;
}
export const conversations = {
  create: async () => sessionSchema.parse(await request("", undefined, {})),
  get: async (session: RecordingSession) =>
    conversationSchema.parse(
      await request(`/${session.conversation.id}`, session.token),
    ),
  turn: async (session: RecordingSession, text: string, requestId: string) =>
    conversationSchema.parse(
      await request(`/${session.conversation.id}/turn`, session.token, {
        text,
        requestId,
        revision: session.conversation.revision,
        channel: "text",
      }),
    ),
  form: async (
    session: RecordingSession,
    draft: TransactionDraft,
    submit = false,
  ) =>
    conversationSchema.parse(
      await request(`/${session.conversation.id}/form`, session.token, {
        draft,
        submit,
        revision: session.conversation.revision,
      }),
    ),
  reviewed: async (session: RecordingSession) =>
    conversationSchema.parse(
      await request(`/${session.conversation.id}/reviewed`, session.token, {
        revision: session.conversation.revision,
        channel: "screen",
      }),
    ),
  confirm: async (session: RecordingSession) =>
    conversationSchema.parse(
      await request(`/${session.conversation.id}/confirm`, session.token, {
        revision: session.conversation.revision,
      }),
    ),
  voiceToken: async (session: RecordingSession) =>
    voiceTokenSchema.parse(
      await request(
        `/${session.conversation.id}/voice-token`,
        session.token,
        {},
      ),
    ),
};
