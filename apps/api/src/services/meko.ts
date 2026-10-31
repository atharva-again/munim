import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { z } from "zod";

export const memoryAgentId = "munim";
let connection: Promise<Client> | null = null;
let generation = Symbol();
async function getMekoClient(): Promise<Client> {
  if (connection) return connection;
  const apiKey = process.env.MEKO_API_KEY;
  if (!apiKey) throw new MekoConfigurationError();
  const token = Symbol();
  generation = token;
  const pending = (async () => {
    const client = new Client({ name: "munim", version: "0.2.0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(process.env.MEKO_MCP_URL ?? "https://mcp.mekodata.ai/mcp"),
      { requestInit: { headers: { Authorization: `Bearer ${apiKey}` } } },
    );
    client.onclose = () => {
      if (generation === token) connection = null;
    };
    const timer = setTimeout(() => void client.close(), 10_000);
    try {
      await client.connect(transport);
      return client;
    } catch (error) {
      if (generation === token) connection = null;
      throw error;
    } finally {
      clearTimeout(timer);
    }
  })();
  connection = pending;
  return pending;
}
export async function closeMekoConnection(): Promise<void> {
  const current = connection;
  connection = null;
  generation = Symbol();
  const client = await current?.catch(() => null);
  await client?.close();
}

export function isMekoConfigured(): boolean {
  return Boolean(
    process.env.MEKO_API_KEY &&
      (process.env.MEKO_PROVISIONING_DATAPACK_ID ||
        process.env.MEKO_DATAPACK_ID),
  );
}

export class MekoConfigurationError extends Error {
  constructor() {
    super("Business memory is unavailable. Check its server configuration.");
    this.name = "MekoConfigurationError";
  }
}

const objectSchema = z.record(z.string(), z.unknown());
export function unwrapMekoResult(value: unknown): unknown {
  if (typeof value === "string") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      return value;
    }
    return unwrapMekoResult(parsed);
  }
  const record = objectSchema.safeParse(value);
  if (!record.success) return value;
  const object = record.data;
  const detail = objectSchema.safeParse(object.detail);
  if (
    object.error ||
    object.isError === true ||
    (detail.success && detail.data.error)
  )
    throw new Error("Meko rejected the request.");
  if (object.structuredContent !== undefined)
    return unwrapMekoResult(object.structuredContent);
  if (object.result !== undefined) return unwrapMekoResult(object.result);
  if (Array.isArray(object.content)) {
    const text = object.content.find(
      (block: unknown) =>
        z.object({ type: z.literal("text"), text: z.string() }).safeParse(block)
          .success,
    );
    const parsed = z.object({ text: z.string() }).safeParse(text);
    if (parsed.success) return unwrapMekoResult(parsed.data.text);
  }
  return object;
}

export async function callMekoTool(
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal = AbortSignal.timeout(15_000),
): Promise<unknown> {
  signal.throwIfAborted();
  let cancel: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    cancel = () => reject(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
  });
  try {
    const client = await Promise.race([getMekoClient(), aborted]);
    signal.throwIfAborted();
    const result = await client.callTool(
      {
        name,
        arguments: args,
      },
      undefined,
      { signal, timeout: 12_000 },
    );
    return unwrapMekoResult(result);
  } finally {
    signal.removeEventListener("abort", cancel);
  }
}
