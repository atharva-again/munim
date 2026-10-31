import { z } from "zod";
import { currentLanguage, localizedError, translate } from "./translations";
export async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (error) {
    if (init?.signal?.aborted) throw error;
    throw new Error(
      translate(currentLanguage(), "Could not reach Munim. Please try again."),
    );
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(payload);
    throw new Error(
      localizedError(
        error.success ? error.data.error : "Could not complete that request.",
        response.status,
      ),
    );
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    console.warn("[api-response]", { path, status: response.status });
    throw new Error(
      translate(currentLanguage(), "Could not complete that request."),
    );
  }
  return parsed.data;
}
