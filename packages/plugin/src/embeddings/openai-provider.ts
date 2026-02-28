import type { EmbeddingProvider } from "./types.js";

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

export interface OpenAIProviderOptions {
  apiKey?: string;
  model?: string;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private model: string;

  constructor(options?: OpenAIProviderOptions) {
    this.apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY ?? "";
    this.model = options?.model ?? "text-embedding-3-small";

    if (!this.apiKey) {
      throw new Error("OpenAI API key is required (pass apiKey or set OPENAI_API_KEY)");
    }
  }

  async embed(texts: string[]): Promise<Float64Array[]> {
    if (texts.length === 0) return [];

    const batchSize = 2048;
    const allEmbeddings: Float64Array[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await this.callApi(batch);
      allEmbeddings.push(...embeddings);
    }

    return allEmbeddings;
  }

  dimensions(): number {
    return 1536;
  }

  name(): string {
    return `openai:${this.model}`;
  }

  private async callApi(texts: string[], retries = 2): Promise<Float64Array[]> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            input: texts,
            model: this.model,
          }),
        });

        if (response.status === 429 && attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        if (!response.ok) {
          const body = await response.text();
          throw new Error(`OpenAI API error ${response.status}: ${body}`);
        }

        const json = (await response.json()) as OpenAIEmbeddingResponse;
        return json.data.map((d) => new Float64Array(d.embedding));
      } catch (err) {
        if (attempt === retries) throw err;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Unreachable");
  }
}
