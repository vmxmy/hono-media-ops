# 统一文章与素材的 Embedding 配置 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 文章 embedding 与素材 embedding 统一使用 `EMBEDDING_API_*` 配置（URL/KEY/MODEL），避免双配置与环境不一致问题。

**Architecture:** 将 `embedding.service.ts` 的 OpenAI 客户端初始化改为读取 `env.EMBEDDING_API_*`，与 `style-analysis/search.service.ts` 一致。保留 API 兼容模式，确保文章 embedding 走同一后端。补充测试验证调用时会触发（不实际打到外部 API）。

**Tech Stack:** TypeScript, Node test runner, OpenAI SDK, env-nextjs

---

### Task 1: 为 embeddingService 配置统一增加测试

**Files:**
- Create: `src/server/services/__tests__/article-embedding-config.test.ts`
- Modify: `src/server/services/embedding.service.ts`

**Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { embeddingService } from "@/server/services/embedding.service";

const original = process.env.EMBEDDING_API_KEY;

test("embeddingService should use EMBEDDING_API_KEY", async () => {
  process.env.EMBEDDING_API_KEY = "test-key";
  process.env.EMBEDDING_API_URL = "https://example.com/v1";
  process.env.EMBEDDING_MODEL = "text-embedding-v3";

  const client = embeddingService.getOpenAIClient();

  assert.ok(client);
  assert.equal(process.env.EMBEDDING_API_KEY, "test-key");

  process.env.EMBEDDING_API_KEY = original;
});
```

**Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/server/services/__tests__/article-embedding-config.test.ts`
Expected: FAIL（当前还在读 OPENAI_API_KEY）。

**Step 3: Write minimal implementation**

将 `getOpenAIClient` 改为：

```ts
const apiKey = env.EMBEDDING_API_KEY;
const apiUrl = env.EMBEDDING_API_URL;
return new OpenAI({ apiKey, baseURL: apiUrl });
```

并统一 `EMBEDDING_MODEL` 来源于 `env.EMBEDDING_MODEL`。

**Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/server/services/__tests__/article-embedding-config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/server/services/embedding.service.ts src/server/services/__tests__/article-embedding-config.test.ts

git commit -m "chore: 统一文章 embedding 配置"
```

---

### Task 2: 回归验证

**Files:**
- None

**Step 1: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

