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
import * as silero from "@livekit/agents-plugin-silero";
import {
  conversationSchema,
  greetingFor,
  type Conversation,
  type PreferredLanguage,
} from "@munim/contracts";
import { SarvamRealtimeSTT, SarvamStreamingTTS } from "./sarvam.js";
config({ path: "../../.env" });
config();
const metadataSchema = z.object({
  id: z.string().uuid(),
  token: z.string().min(32),
});
const savedNotices: Record<PreferredLanguage, string> = {
  en: "That entry is saved. Choose New Entry to record another transaction.",
  hi: "वह लेन-देन सेव हो गया है। अगला लेन-देन लिखने के लिए नया लेन-देन चुनिए।",
  hinglish: "वह entry save हो गई है। अगली entry के लिए New Entry चुनिए।",
};
const failureNotices: Record<PreferredLanguage, string> = {
  en: "I could not finish that. Please check the draft on screen before trying again.",
  hi: "यह पूरा नहीं हो पाया। दोबारा कोशिश करने से पहले स्क्रीन पर विवरण देख लीजिए।",
  hinglish:
    "यह पूरा नहीं हो पाया। दोबारा try करने से पहले screen पर draft देख लीजिए।",
};
class MunimAgent extends voice.Agent {
  private language: PreferredLanguage = "en";
  constructor(
    private readonly connection: z.infer<typeof metadataSchema>,
    private readonly publish: (state: Conversation) => Promise<void>,
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
  override async onUserTurnCompleted(
    _context: llm.ChatContext,
    message: llm.ChatMessage,
  ) {
    try {
      const before = await this.request();
      if (before.phase === "saved") {
        this.session.say(savedNotices[this.language]);
        throw new voice.StopResponse();
      }
      const state = await this.request("turn", {
        requestId: randomUUID(),
        revision: before.revision,
        text: message.textContent,
        channel: "voice",
      });
      await this.publish(state).catch((error) =>
        console.error("[voice-update]", { conversationId: state.id, error }),
      );
      const speech = this.session.say(state.reply, {
        allowInterruptions: true,
      });
      await speech.waitForPlayout();
      if (
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
      this.session.say(failureNotices[this.language]);
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
    const agent = new MunimAgent(metadata, async (state) => {
      await ctx.room.localParticipant?.publishData(
        new TextEncoder().encode(
          JSON.stringify({ id: state.id, revision: state.revision }),
        ),
        { reliable: true, topic: "munim.conversation" },
      );
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
        interruption: { enabled: true, mode: "vad", minDuration: 500 },
        endpointing: { minDelay: 200, maxDelay: 1800 },
      },
    });
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
      inputOptions: { textEnabled: false },
    });
    session.on(voice.AgentSessionEventTypes.Close, () =>
      ctx.shutdown("Voice session ended"),
    );
    const lifetime = setTimeout(() => void session.close(), 20 * 60_000);
    ctx.addShutdownCallback(async () => {
      clearTimeout(lifetime);
      await session.close();
    });
    const greeting = session.say(
      initialState.phase === "saved"
        ? savedNotices[initialState.language]
        : greetingFor(initialState.language),
      { allowInterruptions: true },
    );
    await greeting.waitForPlayout();
    if (
      initialState.phase === "review" &&
      !greeting.interrupted &&
      !greeting.exception()
    ) {
      const current = await agent.request();
      if (
        current.phase === "review" &&
        current.revision === initialState.revision
      ) {
        const review = session.say(current.reply, { allowInterruptions: true });
        await review.waitForPlayout();
        if (!review.interrupted && !review.exception())
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
