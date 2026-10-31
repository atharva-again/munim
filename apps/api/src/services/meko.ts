import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const agentId = "munim";

export function isMekoConfigured(): boolean {
  return Boolean(process.env.MEKO_API_KEY && process.env.MEKO_DATAPACK_ID);
}

export class MekoConfigurationError extends Error {
  constructor() {
    super("Add MEKO_API_KEY and MEKO_DATAPACK_ID to connect business memory.");
    this.name = "MekoConfigurationError";
  }
}

export async function callMekoTool(
  name: string,
  args: Record<string, unknown>,
  signal: AbortSignal = AbortSignal.timeout(15_000),
): Promise<unknown> {
  const apiKey = process.env.MEKO_API_KEY;
  const datapackId = process.env.MEKO_DATAPACK_ID;
  if (!apiKey || !datapackId) throw new MekoConfigurationError();

  const client = new Client({ name: "munim", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(
    new URL(process.env.MEKO_MCP_URL ?? "https://mcp.mekodata.ai/mcp"),
    {
      requestInit: {
        signal,
        headers: { Authorization: `Bearer ${apiKey}` },
      },
    },
  );

  await client.connect(transport);
  try {
    const result = await client.callTool({
      name,
      arguments: {
        ...args,
        agent_id: agentId,
        datapack_id: datapackId,
      },
    });
    if (result.isError) {
      throw new Error(`Meko tool ${name} returned an error.`);
    }
    return result;
  } finally {
    await client.close();
  }
}
