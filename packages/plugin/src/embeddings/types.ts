export interface EmbeddingProvider {
  embed(texts: string[]): Promise<Float64Array[]>;
  dimensions(): number;
  name(): string;
}
