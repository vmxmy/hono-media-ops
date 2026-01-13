# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

T3 Stack application (Next.js + tRPC + Tailwind + Drizzle + PostgreSQL) for AI-powered article generation. Features a declarative A2UI protocol for agent-generated user interfaces.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server

# Database
npm run db:generate      # Generate Drizzle migrations
npm run db:migrate       # Apply migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Drizzle Studio

# Build & Check
npm run build            # Production build
npm run typecheck        # TypeScript check
npm run lint             # ESLint check

# A2UI Code Generation
npm run a2ui:generate    # Generate types and catalog from schema
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **API**: tRPC with React Query
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS with tweakcn themes
- **UI Protocol**: A2UI (Agent-to-User Interface)

### Directory Structure
```
src/
├── app/                 # Next.js App Router pages
├── components/
│   ├── a2ui/           # A2UI renderer and components
│   └── ...             # Other React components
├── lib/
│   └── a2ui/           # A2UI core library
├── server/
│   ├── api/
│   │   ├── trpc.ts     # tRPC context (injects services)
│   │   ├── root.ts     # Router aggregation
│   │   └── routers/    # tRPC routers (validation + delegation)
│   ├── services/       # Business logic layer
│   └── db/             # Drizzle ORM schema and client
├── contexts/           # React contexts (i18n, theme)
└── hooks/              # Custom React hooks
```

---

## Service Layer Development Guidelines

The project uses a **Service Layer Pattern** to separate business logic from tRPC routers. Services are injected into tRPC context for easy access.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  tRPC Router (routers/*.ts)                                 │
│  - Input validation (Zod schemas)                           │
│  - Delegates to ctx.services.*                              │
├─────────────────────────────────────────────────────────────┤
│  Service Layer (services/*.ts)                              │
│  - Business logic                                           │
│  - Database operations                                      │
│  - Reusable across routers                                  │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (db/schema.ts)                              │
│  - Drizzle ORM schema definitions                           │
│  - Type inference                                           │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/server/services/
├── index.ts                  # Aggregates all services + exports `services` object
├── task.service.ts           # Task business logic
├── prompt.service.ts         # Prompt business logic
└── reverse-log.service.ts    # Reverse engineering log logic
```

### Creating a New Service

**1. Create service file** (`src/server/services/example.service.ts`):

```typescript
import { eq, desc } from "drizzle-orm";
import { db } from "@/server/db";
import { examples } from "@/server/db/schema";

// ==================== Types ====================

export interface CreateExampleInput {
  name: string;
  value?: string;
}

// ==================== Service ====================

export const exampleService = {
  async getAll() {
    return db.select().from(examples).orderBy(desc(examples.createdAt));
  },

  async getById(id: string) {
    const [item] = await db
      .select()
      .from(examples)
      .where(eq(examples.id, id))
      .limit(1);
    return item ?? null;
  },

  async create(input: CreateExampleInput) {
    const id = crypto.randomUUID();
    await db.insert(examples).values({ id, ...input });
    return { id };
  },

  async delete(id: string) {
    await db.delete(examples).where(eq(examples.id, id));
    return { success: true };
  },
};

export type ExampleService = typeof exampleService;
```

**2. Register in index.ts** (`src/server/services/index.ts`):

```typescript
export { exampleService } from "./example.service";
export type { ExampleService, CreateExampleInput } from "./example.service";

import { exampleService } from "./example.service";

export const services = {
  // ... existing services
  example: exampleService,
} as const;
```

**3. Create router** (`src/server/api/routers/example.ts`):

```typescript
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const createInputSchema = z.object({
  name: z.string().min(1),
  value: z.string().optional(),
});

export const exampleRouter = createTRPCRouter({
  getAll: protectedProcedure
    .query(({ ctx }) => ctx.services.example.getAll()),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx, input }) => ctx.services.example.getById(input.id)),

  create: protectedProcedure
    .input(createInputSchema)
    .mutation(({ ctx, input }) => ctx.services.example.create(input)),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => ctx.services.example.delete(input.id)),
});
```

**4. Add to root router** (`src/server/api/root.ts`):

```typescript
import { exampleRouter } from "./routers/example";

export const appRouter = createTRPCRouter({
  // ... existing routers
  example: exampleRouter,
});
```

### Service Conventions

| Convention | Description |
|------------|-------------|
| **Naming** | `{entity}.service.ts` (e.g., `task.service.ts`) |
| **Export** | Named export as `{entity}Service` object |
| **Types** | Define input types in same file with `{Action}{Entity}Input` naming |
| **Methods** | Use async functions, return typed results |
| **DB access** | Import `db` from `@/server/db`, use Drizzle ORM |
| **IDs** | Generate with `crypto.randomUUID()` |
| **Errors** | Throw errors for business logic failures |

### Router Conventions

| Convention | Description |
|------------|-------------|
| **Validation** | Define Zod schemas at top of file |
| **Delegation** | Router methods should only validate and delegate to service |
| **No business logic** | Keep routers thin, move logic to services |
| **Naming** | Use `protectedProcedure` for authenticated endpoints |

### Context Injection

Services are injected into tRPC context in `src/server/api/trpc.ts`:

```typescript
import { services } from "@/server/services";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    services,  // All services available via ctx.services.*
    ...opts,
  };
};
```

### Benefits

- **Testability**: Services can be unit tested independently
- **Reusability**: Same service can be used by multiple routers
- **Separation of concerns**: Routers handle HTTP/validation, services handle business logic
- **Type safety**: Full TypeScript inference from service to client

---

## A2UI Development Guidelines

A2UI (Agent-to-User Interface) is a declarative JSON protocol for rendering agent-generated UIs. Uses **Schema-First** architecture where a single JSON schema generates both TypeScript types and Catalog definitions.

### Schema-First Architecture

```
src/lib/a2ui/schema/standard-catalog.json  ← Single source of truth
       ↓
scripts/generate-a2ui.ts                   ← Code generator
       ↓
src/lib/a2ui/generated/
  ├── types.ts                             ← Generated TypeScript types
  ├── catalog.ts                           ← Generated Catalog definitions
  └── index.ts                             ← Unified exports
```

**Workflow:**
1. Edit `src/lib/a2ui/schema/standard-catalog.json` to add/modify components
2. Run `npm run a2ui:generate` to regenerate code
3. Implement React component in `src/components/a2ui/standard-components.tsx`
4. Register component in `src/components/a2ui/setup.ts`

### Core Concepts

```
JSON Node → Registry Lookup → React Component → Rendered UI
```

1. **Schema** (`src/lib/a2ui/schema/standard-catalog.json`) - Single source of truth
2. **Generated Types** (`src/lib/a2ui/generated/types.ts`) - Auto-generated TypeScript types
3. **Registry** (`src/lib/a2ui/registry.ts`) - Maps types to React implementations
4. **Renderer** (`src/components/a2ui/renderer.tsx`) - Renders nodes using registry
5. **Components** (`src/components/a2ui/standard-components.tsx`) - React implementations

### Standard Component Types

| Category | Types |
|----------|-------|
| **Layout** | `column`, `row`, `container`, `card` |
| **Content** | `text`, `image`, `icon`, `divider` |
| **Interactive** | `button`, `input`, `textarea`, `select`, `checkbox`, `tabs` |
| **Feedback** | `badge`, `progress`, `modal` |

### Creating A2UI Nodes

```typescript
import type { A2UINode } from "@/lib/a2ui"

const node: A2UINode = {
  type: "card",
  id: "task-1",
  children: [
    { type: "text", text: "Task Title", variant: "h3" },
    { type: "badge", text: "Processing", color: "processing" },
    {
      type: "button",
      text: "Retry",
      variant: "secondary",
      onClick: { action: "retry", args: ["task-1"] }
    }
  ]
}
```

### Rendering A2UI

```tsx
import { A2UIRenderer } from "@/components/a2ui"

function MyComponent() {
  const handleAction = (action: string, args?: unknown[]) => {
    // Handle actions from A2UI components
  }

  return <A2UIRenderer node={node} onAction={handleAction} />
}
```

### Creating Custom Components

1. **Define the node type** in `src/components/a2ui/custom-components.tsx`:
```typescript
interface MyCustomNode extends A2UIBaseNode {
  type: "my-custom"
  title: string
  // ... other properties
}
```

2. **Create the component**:
```typescript
export function MyCustomComponent({ node, onAction }: A2UIComponentProps<MyCustomNode>) {
  return <div>{node.title}</div>
}
```

3. **Register the component**:
```typescript
import { getDefaultRegistry } from "@/lib/a2ui"

getDefaultRegistry().register("my-custom", MyCustomComponent, { source: "custom" })
```

### Adding Standard Components (Schema-First)

1. **Add to schema** (`src/lib/a2ui/schema/standard-catalog.json`):
```json
{
  "components": {
    "avatar": {
      "description": "User avatar with image or initials",
      "category": "content",
      "properties": {
        "src": { "type": "string", "description": "Image URL" },
        "alt": { "type": "string", "description": "Alt text" },
        "size": { "type": "string", "enum": ["sm", "md", "lg"], "default": "md" },
        "fallback": { "type": "string", "description": "Initials when no image" }
      }
    }
  }
}
```

2. **Regenerate code**:
```bash
npm run a2ui:generate
```

3. **Implement component** (`src/components/a2ui/standard-components.tsx`):
```typescript
export function A2UIAvatar({ node }: A2UIComponentProps<A2UIAvatarNode>) {
  return <img src={node.src} alt={node.alt} className="..." />
}
```

4. **Register component** (`src/components/a2ui/setup.ts`):
```typescript
registry.register("avatar", A2UIAvatar, { source: "standard" })
```

### Overriding Standard Components

```typescript
import { getDefaultRegistry } from "@/lib/a2ui"

// Replace the default button with a custom implementation
getDefaultRegistry().override("button", MyCustomButton)
```

### Data Transformers

Use transformers to convert domain data to A2UI nodes:

```typescript
import { transformTaskListToA2UI } from "@/lib/a2ui"

const a2uiNodes = transformTaskListToA2UI(tasks, {
  canRetry: (status) => status === "failed",
  canStop: (status) => status === "processing",
  labels: { ... },
  statusLabels: { ... }
})
```

### A2UI Actions

Actions are handled via the `onAction` callback:

```typescript
const handleAction = (action: string, args?: unknown[]) => {
  switch (action) {
    case "retry":
      const taskId = args?.[0] as string
      retryTask(taskId)
      break
    case "delete":
      deleteTask(args?.[0] as string)
      break
  }
}
```

### Best Practices

1. **Use IDs** - Always provide unique `id` for nodes that need to be updated
2. **Prefer transformers** - Create reusable transformers for domain data
3. **Action naming** - Use verb-based action names: `retry`, `delete`, `submit`
4. **Type safety** - Define proper TypeScript types for custom nodes
5. **Component props** - Use `A2UIComponentProps<T>` for type-safe component props

### File Locations

| Purpose | Location |
|---------|----------|
| **Schema (Source of Truth)** | `src/lib/a2ui/schema/standard-catalog.json` |
| Code generator | `scripts/generate-a2ui.ts` |
| Generated types | `src/lib/a2ui/generated/types.ts` |
| Generated catalog | `src/lib/a2ui/generated/catalog.ts` |
| Registry | `src/lib/a2ui/registry.ts` |
| Standard components | `src/components/a2ui/standard-components.tsx` |
| Custom components | `src/components/a2ui/custom-components.tsx` |
| Renderer | `src/components/a2ui/renderer.tsx` |
| Setup/initialization | `src/components/a2ui/setup.ts` |
| Data transformers | `src/lib/a2ui/task-transformer.ts` |

---

## Environment Variables

Copy `.env.example` to `.env.local`:
- `DATABASE_URL`: PostgreSQL connection string
- `N8N_WRITING_WEBHOOK_URL`: Endpoint for task processing webhooks

## Database Schema

Drizzle ORM with PostgreSQL. Migrations in `drizzle/` directory.

### Migration Commands
```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:migrate    # Apply pending migrations
npm run db:push       # Push schema directly (dev only)
npm run db:studio     # Open Drizzle Studio
```

### Tables

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `users` | id (uuid), username, access_code | Soft delete support |
| `tasks` | id, user_id (FK), topic, status (enum), article_config (jsonb), cover_config (jsonb) | JSONB for structured configs |
| `task_executions` | id, task_id (FK), status (enum), result (jsonb), input_snapshot (jsonb) | Cascade delete with task |
| `prompts` | id, name, content, category, metadata (jsonb) | Soft delete support |
| `wechat_articles` | id, url (unique), title, images (jsonb) | Soft delete support |
| `reverse_engineering_logs` | id, user_id (FK), reverse_result (jsonb), metrics (jsonb), status (enum) | JSONB for structured results |

### Enum Types
- `task_status`: pending, processing, completed, failed, cancelled
- `execution_status`: running, completed, failed
- `reverse_log_status`: SUCCESS, FAILED, PENDING

### JSONB Structures
```typescript
// tasks.article_config
{ style?: string, openingExample?: string, structureGuide?: string, outputSchema?: string }

// tasks.cover_config
{ prompt?: string, ratio?: string, resolution?: string, model?: string, mode?: string, negativePrompt?: string }

// reverse_engineering_logs.metrics
{ burstiness?: number, ttr?: number, avgSentLen?: number }
```
