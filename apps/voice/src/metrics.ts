import { AsyncLocalStorage } from "node:async_hooks";

export type VoiceTurn = {
  conversationId: string;
  turnId: string;
};
const turns = new AsyncLocalStorage<VoiceTurn>();
export function currentVoiceTurn() {
  return turns.getStore();
}
export function inVoiceTurn<T>(turn: VoiceTurn, operation: () => T): T {
  return turns.run(turn, operation);
}
export function voiceMetric(
  stage: string,
  values: Record<string, number | string | boolean>,
  turn = turns.getStore(),
) {
  console.info("[voice-metric]", {
    ...turn,
    stage,
    at: new Date().toISOString(),
    ...values,
  });
}
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
