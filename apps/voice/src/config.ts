import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
config();

const integer = (fallback: number, minimum: number, maximum: number) =>
  z.coerce.number().int().min(minimum).max(maximum).default(fallback);
const schema = z.object({
  SARVAM_STT_MODEL: z.string().min(1).default("saaras:v4"),
  SARVAM_STT_STREAM_TYPE: z
    .enum(["fast", "balanced", "simulated"])
    .default("balanced"),
  SARVAM_STT_SILENCE_MS: integer(600, 300, 2000),
  SARVAM_STT_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
  SARVAM_STT_MIN_SPEECH_MS: integer(300, 100, 1000),
  SARVAM_STT_KEYTERMS: z.preprocess(
    (value) => {
      if (value === undefined || value === "") return [];
      if (typeof value !== "string") return value;
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    },
    z.array(z.string().trim().min(1).max(64)).max(50),
  ),
  MUNIM_VAD_ACTIVATION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.65),
  MUNIM_VAD_MIN_SPEECH_MS: integer(350, 100, 2000),
  MUNIM_VAD_MIN_SILENCE_MS: integer(650, 100, 2000),
  SARVAM_TTS_MODEL: z.string().min(1).default("bulbul:v4-flash"),
  SARVAM_TTS_SPEAKER: z.string().optional(),
  SARVAM_TTS_TIMEOUT_MS: integer(15000, 3000, 30000),
  MUNIM_API_URL: z.url().default("http://localhost:3001"),
  MUNIM_ENDPOINT_MIN_DELAY_MS: integer(100, 0, 1000),
  MUNIM_ENDPOINT_MAX_DELAY_MS: integer(1800, 1000, 5000),
  MUNIM_INTERRUPTION_MIN_MS: integer(650, 300, 1500),
  MUNIM_INTERRUPTION_MIN_WORDS: integer(1, 1, 5),
  MUNIM_FALSE_INTERRUPTION_MS: integer(1200, 500, 4000),
  MUNIM_VOICE_MAX_JOBS: integer(4, 1, 100),
  MUNIM_VOICE_IDLE_PROCESSES: integer(1, 1, 8),
  MUNIM_VOICE_DRAIN_TIMEOUT_MS: integer(120000, 10000, 1200000),
  MUNIM_VOICE_BACKEND_TIMEOUT_MS: integer(30000, 5000, 65000),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw new Error(
    `Invalid voice configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
  );
export const voiceConfig = parsed.data;
