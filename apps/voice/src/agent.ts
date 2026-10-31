import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  cli,
  defineAgent,
  ServerOptions,
  voice,
  type JobContext,
  type JobProcess,
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
import { voiceConfig } from "./config.js";
import {
  currentVoiceTurn,
  errorName,
  inVoiceTurn,
  voiceMetric,
  type VoiceTurn,
} from "./metrics.js";

const warmed = new WeakMap<
  JobProcess,
  Promise<{
    vad: Awaited<ReturnType<typeof silero.VAD.load>>;
    noiseCancellation: ReturnType<typeof NoiseCancellation>;
  }>
>();
function warmProcess(proc: JobProcess) {
  const existing = warmed.get(proc);
  if (existing) return existing;
  const ready = silero.VAD.load({
    minSpeechDuration: voiceConfig.MUNIM_VAD_MIN_SPEECH_MS,
    minSilenceDuration: voiceConfig.MUNIM_VAD_MIN_SILENCE_MS,
    activationThreshold: voiceConfig.MUNIM_VAD_ACTIVATION_THRESHOLD,
  }).then((vad) => ({ vad, noiseCancellation: NoiseCancellation() }));
  warmed.set(proc, ready);
  return ready;
}
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
  private latest: Conversation | undefined;
  private announcedEntry: string | null = null;
  private inputVersion = 0;
  private turn: VoiceTurn;
  private lastSpeechEndAt: number | undefined;
  private readonly abort = new AbortController();
  constructor(
    private readonly connection: z.infer<typeof metadataSchema>,
    private readonly publish: {
      conversation: (state: Conversation) => Promise<void>;
      activity: (state: Activity) => Promise<void>;
      caption: (
        caption: Omit<z.infer<typeof voiceCaptionSchema>, "id">,
      ) => Promise<void>;
    },
  ) {
    super({
      instructions:
        "Conversations are interpreted and validated by Munim's backend.",
    });
    this.turn = { conversationId: connection.id, turnId: randomUUID() };
  }
  close() {
    this.abort.abort();
  }
  stoppedSpeaking(at: number) {
    this.lastSpeechEndAt = at;
  }
  startedSpeaking() {
    this.lastSpeechEndAt = undefined;
  }
  falseInterruption() {
    voiceMetric("false_interruption", {}, this.turn);
  }
  async request(action = "", body?: unknown) {
    const startedAt = performance.now();
    const send = () =>
      fetch(
        `${voiceConfig.MUNIM_API_URL.replace(/\/$/, "")}/api/conversations/${this.connection.id}${action ? `/${action}` : ""}`,
        {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: `Bearer ${this.connection.token}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.any([
            this.abort.signal,
            AbortSignal.timeout(voiceConfig.MUNIM_VOICE_BACKEND_TIMEOUT_MS),
          ]),
        },
      );
    let response: Response;
    try {
      response = await send();
    } catch (error) {
      if (
        !(error instanceof TypeError) ||
        action !== "turn" ||
        this.abort.signal.aborted
      )
        throw error;
      voiceMetric("backend_network_retry", { action });
      response = await send();
    }
    voiceMetric("backend_response", {
      action: action || "get",
      durationMs: Math.round(performance.now() - startedAt),
      status: response.status,
    });
    if (!response.ok)
      throw new Error(
        `Munim conversation request failed (${response.status}).`,
      );
    const state = conversationSchema.parse(await response.json());
    this.language = state.language;
    this.latest = state;
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
    await inVoiceTurn(this.turn, () => this.speak(state.reply, inputVersion));
  }
  async heard(text: string, final: boolean) {
    if (final) {
      this.inputVersion += 1;
      this.turn = { conversationId: this.connection.id, turnId: randomUUID() };
      voiceMetric(
        "stt_final",
        {
          inputVersion: this.inputVersion,
          ...(this.lastSpeechEndAt === undefined
            ? {}
            : { vadToFinalMs: Math.max(0, Date.now() - this.lastSpeechEndAt) }),
        },
        this.turn,
      );
    }
    await this.publish.caption({
      role: "user",
      text,
      final,
      turnId: final ? this.turn.turnId : undefined,
    });
  }
  async speak(text: string, inputVersion = this.inputVersion) {
    if (inputVersion !== this.inputVersion || this.abort.signal.aborted)
      return null;
    await this.publish
      .caption({
        role: "assistant",
        text,
        final: true,
        turnId: (currentVoiceTurn() ?? this.turn).turnId,
      })
      .catch(() => {});
    if (inputVersion !== this.inputVersion || this.abort.signal.aborted)
      return null;
    const startedAt = performance.now();
    const speech = this.session.say(text, { allowInterruptions: true });
    await speech.waitForPlayout();
    const failure = speech.exception();
    voiceMetric("playback_complete", {
      durationMs: Math.round(performance.now() - startedAt),
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
    const turn = this.turn;
    const previousSavedId = this.latest?.transactionId;
    await inVoiceTurn(turn, async () => {
      try {
        await this.publish.activity("processing").catch(() => {});
        const before = this.latest ?? (await this.request());
        const state = await this.request("turn", {
          requestId: turn.turnId,
          revision: before.revision,
          text: message.textContent,
          channel: "voice",
        });
        if (state.phase === "saved") this.announcedEntry = state.transactionId;
        await this.publish.conversation(state).catch((error) =>
          console.error("[voice-update]", {
            conversationId: state.id,
            reason: errorName(error),
          }),
        );
        if (state.phase === "review" && this.announcedEntry === state.entryId)
          throw new voice.StopResponse();
        const speech = await this.speak(state.reply, inputVersion);
        if (
          speech &&
          !speech.interrupted &&
          !speech.exception() &&
          state.replyIsReview &&
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
          reason: errorName(error),
        });
        if (this.abort.signal.aborted) throw new voice.StopResponse();
        const recovered = await this.request().catch(() => null);
        if (recovered)
          await this.publish.conversation(recovered).catch(() => {});
        if (
          recovered?.phase === "saved" &&
          recovered.transactionId !== previousSavedId
        ) {
          this.announcedEntry = recovered.transactionId;
          await this.speak(recovered.reply, inputVersion);
          throw new voice.StopResponse();
        }
        await this.publish.activity("error").catch(() => {});
        await this.speak(failures[this.language], inputVersion);
      } finally {
        await this.publish.activity("ready").catch(() => {});
      }
    });
    throw new voice.StopResponse();
  }
}
export default defineAgent({
  prewarm: warmProcess,
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
    ctx.addShutdownCallback(async () => agent.close());
    const [initialState, resources] = await Promise.all([
      agent.request(),
      warmProcess(ctx.proc),
    ]);
    const session = new voice.AgentSession({
      vad: resources.vad,
      stt: new SarvamRealtimeSTT(key),
      tts: new SarvamStreamingTTS(key),
      connOptions: {
        maxUnrecoverableErrors: 1,
        ttsConnOptions: {
          maxRetry: 0,
          timeoutMs: voiceConfig.SARVAM_TTS_TIMEOUT_MS,
          retryIntervalMs: 0,
        },
      },
      turnHandling: {
        turnDetection: "stt",
        preemptiveGeneration: { enabled: false },
        interruption: {
          enabled: true,
          mode: "vad",
          minDuration: voiceConfig.MUNIM_INTERRUPTION_MIN_MS,
          minWords: voiceConfig.MUNIM_INTERRUPTION_MIN_WORDS,
          falseInterruptionTimeout: voiceConfig.MUNIM_FALSE_INTERRUPTION_MS,
          resumeFalseInterruption: true,
        },
        endpointing: {
          minDelay: voiceConfig.MUNIM_ENDPOINT_MIN_DELAY_MS,
          maxDelay: voiceConfig.MUNIM_ENDPOINT_MAX_DELAY_MS,
        },
      },
    });
    session.on(voice.AgentSessionEventTypes.UserInputTranscribed, (event) => {
      if (event.transcript.trim())
        void agent.heard(event.transcript, event.isFinal).catch(() => {});
    });
    session.on(voice.AgentSessionEventTypes.UserStateChanged, (event) => {
      if (event.newState === "speaking") agent.startedSpeaking();
      if (event.oldState === "speaking" && event.newState !== "speaking")
        agent.stoppedSpeaking(event.createdAt);
    });
    session.on(voice.AgentSessionEventTypes.AgentFalseInterruption, () => {
      agent.falseInterruption();
    });
    ctx.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (participant.identity === `owner-${metadata.id}`) {
        agent.close();
        void session.close();
      }
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
              reason: errorName(error),
            }),
          );
      } catch {}
    });
    session.on(voice.AgentSessionEventTypes.Close, () =>
      ctx.shutdown("Voice session ended"),
    );
    const lifetime = setTimeout(() => {
      agent.close();
      void session.close();
    }, 20 * 60000);
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
        noiseCancellation: resources.noiseCancellation,
      },
    });
    await send("munim.voice", { id: metadata.id, state: "ready" });
    const greeting = await inVoiceTurn(
      { conversationId: metadata.id, turnId: randomUUID() },
      () => agent.speak(greetingFor(initialState.language)),
    );
    if (
      initialState.phase === "review" &&
      initialState.replyIsReview &&
      initialState.approvalMode === "approval" &&
      greeting &&
      !greeting.interrupted &&
      !greeting.exception()
    ) {
      const current = await agent.request();
      if (
        current.phase === "review" &&
        current.replyIsReview &&
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
    numIdleProcesses: voiceConfig.MUNIM_VOICE_IDLE_PROCESSES,
    drainTimeout: voiceConfig.MUNIM_VOICE_DRAIN_TIMEOUT_MS,
    shutdownProcessTimeout: 15000,
    loadFunc: async (worker) =>
      Math.min(1, worker.activeJobs.length / voiceConfig.MUNIM_VOICE_MAX_JOBS),
    loadThreshold: 1,
  }),
);
