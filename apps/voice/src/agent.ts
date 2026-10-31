import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  cli,
  defineAgent,
  ServerOptions,
  voice,
  type JobContext,
  type llm,
} from "@livekit/agents";
import { RoomEvent } from "@livekit/rtc-node";
import * as silero from "@livekit/agents-plugin-silero";
import { NoiseCancellation } from "@livekit/noise-cancellation-node";
import {
  conversationSchema,
  greetingFor,
  type Conversation,
  type PreferredLanguage,
  type voiceActivitySchema,
  type voiceCaptionSchema,
} from "@munim/contracts";
import { SarvamRealtimeSTT, SarvamStreamingTTS } from "./sarvam.js";
config({ path: "../../.env" });
config();
const metadataSchema = z.object({
  id: z.string().uuid(),
  token: z.string().min(32),
});
type Activity = z.infer<typeof voiceActivitySchema>["state"];
const failures: Record<PreferredLanguage, string> = {
  en: "I couldn’t finish that. Please say it again or type it.",
  hi: "यह बात पूरी नहीं हो पाई। फिर से बोलें या लिखकर बताएँ।",
};
class MunimAgent extends voice.Agent {
  private language: PreferredLanguage = "en";
  private announcedEntry: string | null = null;
  private inputVersion = 0;
  constructor(
    private readonly connection: z.infer<typeof metadataSchema>,
    private readonly publish: {
      conversation: (state: Conversation) => Promise<void>;
      activity: (state: Activity) => Promise<void>;
      caption: (
        caption: Pick<z.infer<typeof voiceCaptionSchema>, "role" | "text">,
      ) => Promise<void>;
    },
  ) {
    super({
      instructions:
        "Conversations are interpreted and validated by Munim's backend.",
    });
  }
  async request(action = "", body?: unknown) {
    const response = await fetch(
      `${process.env.MUNIM_API_URL || "http://localhost:3001"}/api/conversations/${this.connection.id}${action ? `/${action}` : ""}`,
      {
        method: body ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${this.connection.token}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(65000),
      },
    );
    if (!response.ok)
      throw new Error(
        `Munim conversation request failed (${response.status}).`,
      );
    const state = conversationSchema.parse(await response.json());
    this.language = state.language;
    return state;
  }
  async screenSaved() {
    const inputVersion = this.inputVersion;
    const state = await this.request();
    if (
      state.phase !== "saved" ||
      state.transactionId === this.announcedEntry ||
      inputVersion !== this.inputVersion
    )
      return;
    this.announcedEntry = state.transactionId;
    await this.session.interrupt({ force: true }).await;
    await this.speak(state.reply, inputVersion);
  }
  async heard(text: string) {
    this.inputVersion += 1;
    await this.publish.caption({ role: "user", text });
  }
  async speak(text: string, inputVersion = this.inputVersion) {
    if (inputVersion !== this.inputVersion) return null;
    await this.publish.caption({ role: "assistant", text }).catch(() => {});
    if (inputVersion !== this.inputVersion) return null;
    const speech = this.session.say(text, { allowInterruptions: true });
    await speech.waitForPlayout();
    const failure = speech.exception();
    console.info("[voice-playback]", {
      conversationId: this.connection.id,
      interrupted: speech.interrupted,
      failed: Boolean(failure),
    });
    if (failure) await this.publish.activity("audio-error").catch(() => {});
    return speech;
  }
  override async onUserTurnCompleted(
    _context: llm.ChatContext,
    message: llm.ChatMessage,
  ) {
    const inputVersion = this.inputVersion;
    try {
      await this.publish.activity("processing").catch(() => {});
      const before = await this.request();
      const state = await this.request("turn", {
        requestId: randomUUID(),
        revision: before.revision,
        text: message.textContent,
        channel: "voice",
      });
      if (state.phase === "saved") this.announcedEntry = state.transactionId;
      await this.publish
        .conversation(state)
        .catch((error) =>
          console.error("[voice-update]", { conversationId: state.id, error }),
        );
      if (state.phase === "review" && this.announcedEntry === state.entryId)
        throw new voice.StopResponse();
      const speech = await this.speak(state.reply, inputVersion);
      if (
        speech &&
        !speech.interrupted &&
        !speech.exception() &&
        state.phase === "review"
      )
        await this.request("reviewed", {
          revision: state.revision,
          channel: "voice",
        });
    } catch (error) {
      if (error instanceof voice.StopResponse) throw error;
      console.error("[voice-turn]", {
        conversationId: this.connection.id,
        error,
      });
      await this.publish.activity("error").catch(() => {});
      await this.speak(failures[this.language], inputVersion);
    } finally {
      await this.publish.activity("ready").catch(() => {});
    }
    throw new voice.StopResponse();
  }
}
export default defineAgent({
  entry: async (ctx: JobContext) => {
    const metadata = metadataSchema.parse(JSON.parse(ctx.job.metadata));
    const key = process.env.SARVAM_API_KEY;
    if (!key) throw new Error("SARVAM_API_KEY is required.");
    await ctx.connect();
    let ownerTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        ctx.waitForParticipant(`owner-${metadata.id}`),
        new Promise<never>((_, reject) => {
          ownerTimeout = setTimeout(
            () => reject(new Error("Voice caller did not join.")),
            30000,
          );
        }),
      ]);
    } finally {
      clearTimeout(ownerTimeout);
    }
    const send = async (topic: string, data: unknown) => {
      await ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true, topic },
      );
    };
    const agent = new MunimAgent(metadata, {
      conversation: (state) =>
        send("munim.conversation", { id: state.id, revision: state.revision }),
      activity: (state) => send("munim.voice", { id: metadata.id, state }),
      caption: (caption) =>
        send("munim.caption", { id: metadata.id, ...caption }),
    });
    const initialState = await agent.request();
    const session = new voice.AgentSession({
      vad: await silero.VAD.load({
        minSpeechDuration: 250,
        minSilenceDuration: 700,
        activationThreshold: 0.6,
      }),
      stt: new SarvamRealtimeSTT(key),
      tts: new SarvamStreamingTTS(key),
      connOptions: { maxUnrecoverableErrors: 1 },
      turnHandling: {
        turnDetection: "stt",
        preemptiveGeneration: { enabled: false },
        interruption: {
          enabled: true,
          mode: "vad",
          minDuration: 650,
          minWords: 1,
          falseInterruptionTimeout: 1200,
          resumeFalseInterruption: true,
        },
        endpointing: { minDelay: 200, maxDelay: 1800 },
      },
    });
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (event) => {
      if (event.isFinal && event.transcript.trim())
        void agent.heard(event.transcript).catch(() => {});
    });
    session.on(voice.AgentSessionEventTypes.AgentFalseInterruption, () => {
      console.info("[voice-false-interruption]", {
        conversationId: metadata.id,
      });
    });
    ctx.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (participant.identity === `owner-${metadata.id}`) void session.close();
    });
    ctx.room.on(RoomEvent.DataReceived, (payload, participant, _, topic) => {
      if (
        topic !== "munim.entry.saved" ||
        participant?.identity !== `owner-${metadata.id}`
      )
        return;
      try {
        const data = z
          .object({ id: z.string().uuid() })
          .safeParse(JSON.parse(new TextDecoder().decode(payload)));
        if (data.success && data.data.id === metadata.id)
          void agent.screenSaved().catch((error) =>
            console.error("[voice-screen-confirm]", {
              conversationId: metadata.id,
              error,
            }),
          );
      } catch {}
    });
    session.on(voice.AgentSessionEventTypes.Close, () =>
      ctx.shutdown("Voice session ended"),
    );
    const lifetime = setTimeout(() => void session.close(), 20 * 60000);
    ctx.addShutdownCallback(async () => {
      clearTimeout(lifetime);
      await session.close();
    });
    if (!ctx.room.remoteParticipants.has(`owner-${metadata.id}`)) {
      clearTimeout(lifetime);
      ctx.shutdown("Voice caller left");
      return;
    }
    await session.start({
      agent,
      room: ctx.room,
      record: {
        audio: false,
        traces: false,
        logs: false,
        transcript: false,
        redaction: true,
      },
      inputOptions: {
        textEnabled: false,
        noiseCancellation: NoiseCancellation(),
      },
    });
    await send("munim.voice", { id: metadata.id, state: "ready" });
    const greeting = await agent.speak(greetingFor(initialState.language));
    if (
      initialState.phase === "review" &&
      initialState.approvalMode === "approval" &&
      greeting &&
      !greeting.interrupted &&
      !greeting.exception()
    ) {
      const current = await agent.request();
      if (
        current.phase === "review" &&
        current.revision === initialState.revision
      ) {
        const review = await agent.speak(current.reply);
        if (review && !review.interrupted && !review.exception())
          await agent.request("reviewed", {
            revision: current.revision,
            channel: "voice",
          });
      }
    }
  },
});
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "munim",
  }),
);
