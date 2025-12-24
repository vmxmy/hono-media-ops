# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Hono-based Cloudflare Workers application for AI-powered article generation. Users submit writing tasks that are processed asynchronously via n8n webhooks, with results stored in D1 database.

## Commands

```bash
# Development
npm run dev              # Start local dev server with wrangler

# Database migrations
npm run d1:migrate       # Apply migrations locally
npm run d1:migrate:remote # Apply migrations to production

# Deployment
npm run deploy           # Deploy to Cloudflare Workers
```

## Architecture

Single-file application (`src/index.ts`) with embedded HTML templates using Hono's `html` helper.

**Flow:**
1. User logs in with username/access_code → JWT issued
2. User submits task (topic, keywords, style templates) → stored in D1 with `processing` status
3. Worker triggers n8n webhook asynchronously via `waitUntil`
4. n8n calls back to update task with generated content (callback endpoint not shown in current code)
5. User views completed article

**Key patterns:**
- `Layout` component wraps all HTML pages with Tailwind CSS (loaded via CDN)
- JWT auth with token passed via Authorization header (API) or query param (article pages)
- User UUID migration: generates UUID on first login if missing
- Tasks scoped by both `user_id` and `user_uuid` for backward compatibility

## Environment Variables

Copy `.dev.vars.example` to `.dev.vars`:
- `JWT_SECRET`: Secret for signing JWT tokens
- `N8N_WEBHOOK_URL`: Endpoint that receives task payloads for processing

## Database

D1 SQLite database with two tables:
- `users`: id, username, access_code, uuid
- `tasks`: id, user_id, user_uuid, topic, keywords, template_id, ref_url, status, result_title, result_content, created_at

Status values: `pending`, `processing`, `completed`, `failed`
