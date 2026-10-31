import { randomUUID } from "node:crypto";
import { once } from "node:events";
import WebSocket from "ws";
import { z } from "zod";
import {
  AudioByteStream,
  asLanguageCode,
  stt,
  tts,
  type APIConnectOptions,
  type AudioBuffer,
} from "@livekit/agents";
import { voiceConfig } from "./config.js";
import { errorName, voiceMetric } from "./metrics.js";

const eventSchema = z.object({
  event: z.string(),
  text: z.string().optional(),
  language: z.string().optional(),
  message: z.string().optional(),
  is_fatal: z.boolean().optional(),
});
export class SarvamRealtimeSTT extends stt.STT {
  label = "munim.SarvamRealtimeSTT";
  constructor(private readonly apiKey: string) {
    super({ streaming: true, interimResults: true });
  }
  override get model() {
    return voiceConfig.SARVAM_STT_MODEL;
  }
  override get provider() {
    return "Sarvam";
  }
  async _recognize(_audio: AudioBuffer): Promise<stt.SpeechEvent> {
    throw new Error("Use streaming recognition.");
  }
  stream() {
    return new SarvamSpeechStream(this, this.apiKey);
  }
}
class SarvamSpeechStream extends stt.SpeechStream {
  label = "munim.SarvamSpeechStream";
  constructor(
    private readonly providerSTT: SarvamRealtimeSTT,
    private readonly apiKey: string,
  ) {
    super(providerSTT, 16000, {
      maxRetry: 0,
      timeoutMs: 10000,
      retryIntervalMs: 0,
    });
  }
  protected async run() {
    const url = new URL("wss://api.sarvam.ai/speech-to-text-realtime/ws");
    url.search = new URLSearchParams({
      model: this.providerSTT.model,
      ...(this.providerSTT.model === "saaras:v4" &&
      voiceConfig.SARVAM_STT_KEYTERMS.length
        ? { keyterms: JSON.stringify(voiceConfig.SARVAM_STT_KEYTERMS) }
        : {}),
      language_code: "auto",
      mode: "transcribe",
      stream_type: voiceConfig.SARVAM_STT_STREAM_TYPE,
      encoding: "linear16",
      sample_rate: "16000",
      endpointing: "vad",
      silence_duration_ms: String(voiceConfig.SARVAM_STT_SILENCE_MS),
      threshold: String(voiceConfig.SARVAM_STT_THRESHOLD),
      min_speech_duration_ms: String(voiceConfig.SARVAM_STT_MIN_SPEECH_MS),
    }).toString();
    const ws = new WebSocket(url, {
      headers: { "api-subscription-key": this.apiKey },
      handshakeTimeout: 10000,
    });
    const stop = () => ws.terminate();
    this.abortController.signal.addEventListener("abort", stop, { once: true });
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      await once(ws, "open");
      timer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN)
          ws.send(JSON.stringify({ event: "ping" }));
      }, 15000);
      const receive = new Promise<void>((resolve, reject) => {
        ws.on("error", reject);
        ws.on("close", () =>
          this.abortController.signal.aborted
            ? resolve()
            : reject(
                new Error("Speech connection closed. Restart voice mode."),
              ),
        );
        ws.on("message", (raw) => {
          try {
            const event = eventSchema.parse(JSON.parse(raw.toString()));
            if (event.event === "error") {
              reject(new Error(event.message || "Speech recognition failed."));
              return;
            }
            if (event.event === "vad.speech_start")
              this.queue.put({ type: stt.SpeechEventType.START_OF_SPEECH });
            if (
              event.event === "transcript.partial" ||
              event.event === "transcript.final"
            ) {
              const final = event.event === "transcript.final";
              this.queue.put({
                type: final
                  ? stt.SpeechEventType.FINAL_TRANSCRIPT
                  : stt.SpeechEventType.INTERIM_TRANSCRIPT,
                alternatives: [
                  {
                    text: event.text ?? "",
                    language: asLanguageCode(event.language ?? "hi-IN"),
                    startTime: 0,
                    endTime: 0,
                    confidence: 0,
                  },
                ],
              });
              if (final)
                this.queue.put({ type: stt.SpeechEventType.END_OF_SPEECH });
            }
          } catch (error) {
            reject(error);
          }
        });
      });
      const send = async () => {
        for await (const frame of this.input) {
          if (frame === SarvamSpeechStream.FLUSH_SENTINEL) continue;
          if (ws.readyState !== WebSocket.OPEN)
            throw new Error("Speech connection lost.");
          if (ws.bufferedAmount > 320_000)
            throw new Error(
              "Speech connection is too slow. Restart voice mode.",
            );
          const audio = Buffer.from(
            frame.data.buffer,
            frame.data.byteOffset,
            frame.data.byteLength,
          ).toString("base64");
          ws.send(JSON.stringify({ event: "audio_input", audio }));
        }
      };
      await Promise.race([send(), receive]);
    } finally {
      clearInterval(timer);
      this.abortController.signal.removeEventListener("abort", stop);
      ws.terminate();
    }
  }
}
export class SarvamStreamingTTS extends tts.TTS {
  label = "munim.SarvamStreamingTTS";
  constructor(readonly apiKey: string) {
    super(24000, 1, { streaming: true });
  }
  override get model() {
    return voiceConfig.SARVAM_TTS_MODEL;
  }
  override get provider() {
    return "Sarvam";
  }
  synthesize(text: string, options?: APIConnectOptions, signal?: AbortSignal) {
    return new SarvamAudioStream(text, this, options, signal);
  }
  stream(options?: { connOptions?: APIConnectOptions }): tts.SynthesizeStream {
    return new SarvamUtteranceStream(this, options?.connOptions);
  }
}
class SarvamUtteranceStream extends tts.SynthesizeStream {
  label = "munim.SarvamUtteranceStream";
  protected override emitMetrics = false;
  constructor(
    private readonly providerTTS: SarvamStreamingTTS,
    options?: APIConnectOptions,
  ) {
    super(providerTTS, options);
  }
  protected async run() {
    let text = "";
    for await (const input of this.input) {
      if (this.abortSignal.aborted) return;
      if (input !== SarvamUtteranceStream.FLUSH_SENTINEL) {
        text += input;
        continue;
      }
      if (!text.trim()) continue;
      const audio = this.providerTTS.synthesize(
        text,
        this.connOptions,
        this.abortSignal,
      );
      try {
        for await (const frame of audio) {
          if (this.abortSignal.aborted) return;
          this.queue.put(frame);
        }
        if (audio.error) throw audio.error;
      } finally {
        audio.close();
      }
      text = "";
      this.queue.put(tts.SynthesizeStream.END_OF_STREAM);
    }
  }
}
class SarvamAudioStream extends tts.ChunkedStream {
  label = "munim.SarvamAudioStream";
  constructor(
    text: string,
    private readonly providerTTS: SarvamStreamingTTS,
    options?: APIConnectOptions,
    signal?: AbortSignal,
  ) {
    super(text, providerTTS, options, signal);
  }
  protected async run() {
    const startedAt = performance.now();
    const response = await fetch(
      "https://api.sarvam.ai/text-to-speech/stream",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": this.providerTTS.apiKey,
        },
        signal: AbortSignal.any([
          this.abortSignal,
          AbortSignal.timeout(voiceConfig.SARVAM_TTS_TIMEOUT_MS),
        ]),
        body: JSON.stringify({
          text: this.inputText,
          model: this.providerTTS.model,
          language_code: /[\u0900-\u097f]/.test(this.inputText)
            ? "hi-IN"
            : "en-IN",
          ...(voiceConfig.SARVAM_TTS_SPEAKER
            ? { speaker: voiceConfig.SARVAM_TTS_SPEAKER }
            : {}),
          speech_sample_rate: 24000,
          output_audio_codec: "linear16",
        }),
      },
    ).catch((error: unknown) => {
      voiceMetric("tts_request_error", {
        durationMs: Math.round(performance.now() - startedAt),
        reason: errorName(error),
      });
      throw error;
    });
    if (!response.ok || !response.body)
      throw new Error(`Speech synthesis unavailable (${response.status}).`);
    const stream = new AudioByteStream(24000, 1, 480),
      requestId = randomUUID();
    const reader = response.body.getReader();
    let last: tts.SynthesizedAudio | undefined;
    let bytes = 0;
    let firstByte = true;
    let complete = false;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstByte) {
          firstByte = false;
          voiceMetric("tts_first_byte", {
            durationMs: Math.round(performance.now() - startedAt),
            model: this.providerTTS.model,
          });
        }
        bytes += value.byteLength;
        for (const frame of stream.write(
          value.buffer.slice(
            value.byteOffset,
            value.byteOffset + value.byteLength,
          ),
        )) {
          if (last) this.queue.put(last);
          last = { requestId, segmentId: requestId, frame, final: false };
        }
      }
      for (const frame of stream.flush()) {
        if (last) this.queue.put(last);
        last = { requestId, segmentId: requestId, frame, final: false };
      }
      if (last) this.queue.put({ ...last, final: true });
      else throw new Error("Speech synthesis returned no audio.");
      complete = true;
    } finally {
      voiceMetric("tts_complete", {
        durationMs: Math.round(performance.now() - startedAt),
        audioDurationMs: Math.round(bytes / 48),
        complete,
        cancelled: this.abortSignal.aborted,
      });
      await reader.cancel();
      reader.releaseLock();
      this.queue.close();
    }
  }
}
