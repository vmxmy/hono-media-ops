import test from "node:test";
import assert from "node:assert/strict";

const originalEnv = {
  EMBEDDING_API_KEY: process.env.EMBEDDING_API_KEY,
  EMBEDDING_API_URL: process.env.EMBEDDING_API_URL,
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};

test.after(() => {
  process.env.EMBEDDING_API_KEY = originalEnv.EMBEDDING_API_KEY;
  process.env.EMBEDDING_API_URL = originalEnv.EMBEDDING_API_URL;
  process.env.EMBEDDING_MODEL = originalEnv.EMBEDDING_MODEL;
  process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
});

test("embeddingService should use EMBEDDING_API_KEY", async () => {
  process.env.EMBEDDING_API_KEY = "test-key";
  process.env.EMBEDDING_API_URL = "https://example.com/v1";
  process.env.EMBEDDING_MODEL = "text-embedding-v3";
  delete process.env.OPENAI_API_KEY;

  const { embeddingService } = await import("@/server/services/embedding.service");

  await assert.doesNotReject(async () => {
    const client = embeddingService.getOpenAIClient();
    assert.ok(client);
  });
});
