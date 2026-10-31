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
import { conversationSchema, type Conversation } from "@munim/contracts";
import { SarvamRealtimeSTT, SarvamStreamingTTS } from "./sarvam.js";
config({ path: "../../.env" });
config();
const metadataSchema = z.object({
  id: z.string().uuid(),
  token: z.string().min(32),
});
class MunimAgent extends voice.Agent {
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
    return conversationSchema.parse(await response.json());
  }
  override async onUserTurnCompleted(
    _context: llm.ChatContext,
    message: llm.ChatMessage,
  ) {
    try {
      const before = await this.request();
      if (before.phase === "saved") {
        this.session.say(
          "That entry is saved. Choose New Entry to record another transaction.",
        );
        throw new voice.StopResponse();
      }
      const state = await this.request("turn", {
        requestId: randomUUID(),
        revision: before.revision,
        text: message.textContent,
        channel: "voice",
      });
      await this.publish(state);
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
      this.session.say(
        "I could not finish that. Please check the draft on screen before trying again.",
      );
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
        new TextEncoder().encode(JSON.stringify(state)),
        { reliable: true, topic: "munim.conversation" },
      );
    });
    const initialState = await agent.request();
    const session = new voice.AgentSession({
      vad: await silero.VAD.load(),
      stt: new SarvamRealtimeSTT(key),
      tts: new SarvamStreamingTTS(key),
      connOptions: { maxUnrecoverableErrors: 1 },
      turnHandling: {
        turnDetection: "stt",
        preemptiveGeneration: { enabled: false },
        interruption: { enabled: true, mode: "vad", minDuration: 350 },
        endpointing: { minDelay: 200, maxDelay: 1500 },
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
      initialState.phase === "review"
        ? initialState.reply
        : "I'm listening. बोलिए, क्या लेन-देन हुआ?",
      { allowInterruptions: true },
    );
    await greeting.waitForPlayout();
    if (
      initialState.phase === "review" &&
      !greeting.interrupted &&
      !greeting.exception()
    )
      await agent.request("reviewed", {
        revision: initialState.revision,
        channel: "voice",
      });
  },
});
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "munim",
  }),
);
