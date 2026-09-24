import type { Sample, SampleOptions } from "./claude";

const MODEL = "claude-opus-5";

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

async function toBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/** Premier objet ou tableau JSON d'une réponse texte. */
function extractJson(text: string): unknown {
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start < 0 || end < start) throw { code: "invalid_json", message: "Réponse sans JSON." };
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw { code: "invalid_json", message: "JSON illisible." };
  }
}

/** Même interface que la capacité « sample » de claude.ai, mais via l'API Claude et la clé de l'utilisateur. */
export function apiSample(apiKey: string): Sample {
  return {
    async limits() {
      return { images: { maxCount: 5, maxInputBytes: 5_000_000, mediaTypes: [...MEDIA_TYPES] } };
    },
    async json<T>(input: string, options: SampleOptions = {}): Promise<T> {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const images = options.images ? (Array.isArray(options.images) ? options.images : [options.images]) : [];
      const imageBlocks = await Promise.all(
        images.map(async (img) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: (MEDIA_TYPES.includes(img.type as MediaType) ? img.type : "image/jpeg") as MediaType,
            data: await toBase64(img),
          },
        })),
      );
      try {
        const response = await client.beta.messages.create(
          {
            model: MODEL,
            max_tokens: 16000,
            output_config: { effort: "low" },
            betas: ["server-side-fallback-2026-07-01"],
            fallbacks: "default",
            messages: [{ role: "user", content: [...imageBlocks, { type: "text", text: input }] }],
          },
          { signal: options.signal },
        );
        if (response.stop_reason === "refusal") throw { code: "refused", message: "Claude a refusé la demande." };
        const text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
        return extractJson(text) as T;
      } catch (e) {
        if (e instanceof Anthropic.APIUserAbortError) throw { code: "cancelled", message: "Annulé." };
        if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
          throw { code: "bad_key", message: "Clé API refusée." };
        if (e instanceof Anthropic.RateLimitError) throw { code: "rate_limited", message: e.message };
        if (e instanceof Anthropic.BadRequestError) throw { code: "bad_request", message: e.message };
        if (e instanceof Anthropic.APIConnectionError) throw { code: "offline", message: "Pas de connexion." };
        if (e instanceof Anthropic.APIError) throw { code: "upstream_error", message: `${e.status ?? ""} ${e.message}` };
        throw e;
      }
    },
  };
}
