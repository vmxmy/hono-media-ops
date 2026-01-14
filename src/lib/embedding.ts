/**
 * Embedding utility functions for vector similarity search
 */
import OpenAI from "openai";

// ==================== OpenAI Client ====================

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

// ==================== Embedding Functions ====================

/**
 * Check if embedding functionality is available
 */
export function isEmbeddingAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Generate embedding vector using OpenAI text-embedding-3-small
 * Returns null if OPENAI_API_KEY is not configured
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const openai = getOpenAIClient();
  if (!openai) {
    return null;
  }

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    return null;
  }

  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical direction
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}
