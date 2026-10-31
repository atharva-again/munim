type Sample = {
  stage: string;
  durationMs: number;
  at: number;
  conversationId?: string;
};
const samples: Sample[] = [];
export function recordTiming(
  stage: string,
  durationMs: number,
  ids: { conversationId?: string; turnId?: string } = {},
) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return;
  samples.push({
    stage,
    durationMs,
    at: Date.now(),
    conversationId: ids.conversationId,
  });
  if (samples.length > 2000) samples.shift();
  console.info(
    JSON.stringify({
      event: "munim.timing",
      stage,
      durationMs: Math.round(durationMs),
      ...ids,
    }),
  );
}
export function timingSummary(conversationIds: string[]) {
  const recent = samples.filter(
    (sample) =>
      sample.at > Date.now() - 60 * 60_000 &&
      sample.conversationId &&
      conversationIds.includes(sample.conversationId),
  );
  return [...new Set(recent.map((sample) => sample.stage))].map((stage) => {
    const values = recent
      .filter((sample) => sample.stage === stage)
      .map((sample) => sample.durationMs)
      .sort((a, b) => a - b);
    return {
      stage,
      count: values.length,
      p50Ms: values[Math.max(0, Math.ceil(values.length * 0.5) - 1)],
      p95Ms: values[Math.max(0, Math.ceil(values.length * 0.95) - 1)],
    };
  });
}
