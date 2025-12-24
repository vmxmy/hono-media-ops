import { Hono } from 'hono'
import { html, raw } from 'hono/html'
import { sign, verify } from 'hono/jwt'
import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, sql } from 'drizzle-orm'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { users, tasks } from './db/schema'

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  code: z.string().min(1, '访问码不能为空'),
})

const createTaskSchema = z.object({
  主题: z.string().min(1, '主题不能为空').optional(),
  topic: z.string().min(1, '主题不能为空').optional(),
  关键字: z.string().optional(),
  keywords: z.string().optional(),
  写作风格: z.string().optional(),
  style: z.string().optional(),
  开场范例: z.string().optional(),
  openingExample: z.string().optional(),
  结构骨架: z.string().optional(),
  structureGuide: z.string().optional(),
  输出结构: z.string().optional(),
  outputSchema: z.string().optional(),
  封面提示词: z.string().optional(),
  coverPrompt: z.string().optional(),
  封面比例: z.string().optional(),
  coverRatio: z.string().optional(),
  封面分辨率: z.string().optional(),
  coverResolution: z.string().optional(),
  封面模型: z.string().optional(),
  coverModel: z.string().optional(),
  封面模式: z.string().optional(),
  coverMode: z.string().optional(),
  封面负面提示词: z.string().optional(),
  coverNegativePrompt: z.string().optional(),
}).refine(data => data.主题 || data.topic, {
  message: '主题不能为空',
})

type Bindings = {
  DB: D1Database
  JWT_SECRET: string
  N8N_WEBHOOK_URL: string
}

type AuthPayload = {
  id: string
}

type TaskRow = typeof tasks.$inferSelect;

const app = new Hono<{ Bindings: Bindings }>()

// Simple in-memory rate limiter (per-isolate, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

const rateLimiter = (limit: number, windowMs: number) => {
  return async (c: { req: { header: (name: string) => string | undefined }; json: (data: unknown, status: number) => Response }, next: () => Promise<void>) => {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    const now = Date.now()
    const key = `${ip}`

    const record = rateLimitMap.get(key)

    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    } else {
      record.count++
      if (record.count > limit) {
        return c.json({ error: '请求过于频繁，请稍后再试' }, 429)
      }
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, v] of rateLimitMap.entries()) {
        if (now > v.resetTime) {
          rateLimitMap.delete(k)
        }
      }
    }

    await next()
  }
}

// Apply rate limiting to API routes (100 requests per minute)
app.use('/api/*', rateLimiter(100, 60000))

// Stricter rate limit for task creation (10 per minute)
app.use('/api/tasks', async (c, next) => {
  if (c.req.method === 'POST') {
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    const key = `create:${ip}`
    const now = Date.now()
    const record = rateLimitMap.get(key)

    if (!record || now > record.resetTime) {
      rateLimitMap.set(key, { count: 1, resetTime: now + 60000 })
    } else {
      record.count++
      if (record.count > 10) {
        return c.json({ error: '创建任务过于频繁，请稍后再试' }, 429)
      }
    }
  }
  await next()
})

const Layout = (props: { title: string; body: unknown }) => html`
<!DOCTYPE html>
<html lang="zh-CN" class="antialiased" id="html-root">
<head>
  <meta charset="utf-8" />
  <title>${props.title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="AI 智能写作中台 - 异步生成文章，自动存档管理" />
  <meta name="theme-color" content="#4a7c59" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="AI写作中台" />
  <link rel="manifest" href="/manifest.json" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✍️</text></svg>" />
  <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✍️</text></svg>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Sora:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            background: "hsl(var(--background))",
            foreground: "hsl(var(--foreground))",
            card: "hsl(var(--card))",
            "card-foreground": "hsl(var(--card-foreground))",
            muted: "hsl(var(--muted))",
            "muted-foreground": "hsl(var(--muted-foreground))",
            border: "hsl(var(--border))",
            primary: "hsl(var(--primary))",
            "primary-foreground": "hsl(var(--primary-foreground))",
            ring: "hsl(var(--ring))",
            accent: "hsl(var(--accent))",
            "accent-foreground": "hsl(var(--accent-foreground))"
          },
          borderRadius: {
            lg: "var(--radius)",
            md: "calc(var(--radius) - 2px)",
            sm: "calc(var(--radius) - 4px)"
          },
          fontFamily: {
            sans: ["Sora", "Noto Sans SC", "sans-serif"]
          }
        }
      }
    }
  </script>
  <style>
    :root {
      --background: 45, 33%, 95%;
      --foreground: 138, 30%, 18%;
      --card: 45, 25%, 98%;
      --card-foreground: 138, 30%, 18%;
      --muted: 138, 12%, 92%;
      --muted-foreground: 138, 15%, 40%;
      --border: 138, 15%, 85%;
      --primary: 138, 25%, 39%;
      --primary-foreground: 45, 33%, 98%;
      --ring: 138, 20%, 50%;
      --accent: 37, 95%, 55%;
      --accent-foreground: 138, 30%, 18%;
      --success: 138, 25%, 39%;
      --success-muted: 138, 30%, 92%;
      --info: 37, 95%, 55%;
      --info-muted: 37, 90%, 92%;
      --danger: 12, 63%, 44%;
      --danger-muted: 12, 60%, 94%;
      --warning: 37, 95%, 55%;
      --warning-muted: 37, 90%, 94%;
      --shadow: 0 12px 30px rgba(74, 124, 89, 0.1);
      --radius: 0.6rem;
    }
    .dark {
      --background: 220, 20%, 10%;
      --foreground: 45, 20%, 92%;
      --card: 220, 18%, 14%;
      --card-foreground: 45, 20%, 92%;
      --muted: 220, 15%, 20%;
      --muted-foreground: 220, 10%, 60%;
      --border: 220, 15%, 25%;
      --primary: 138, 35%, 50%;
      --primary-foreground: 220, 20%, 10%;
      --ring: 138, 30%, 55%;
      --accent: 37, 90%, 55%;
      --accent-foreground: 220, 20%, 10%;
      --success: 138, 35%, 50%;
      --success-muted: 138, 25%, 20%;
      --info: 37, 85%, 50%;
      --info-muted: 37, 40%, 20%;
      --danger: 12, 70%, 55%;
      --danger-muted: 12, 40%, 20%;
      --warning: 37, 85%, 50%;
      --warning-muted: 37, 40%, 20%;
      --shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
    }
  </style>
  <script>
    (function() {
      const theme = localStorage.getItem('theme');
      if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      }
    })();
  </script>
  <style>
    body {
      background:
        radial-gradient(1200px circle at 10% -10%, hsl(138, 20%, 94%) 0%, transparent 45%),
        radial-gradient(900px circle at 90% -20%, hsl(37, 40%, 94%) 0%, transparent 40%),
        hsl(var(--background));
      color: hsl(var(--foreground));
      font-family: "Sora", "Noto Sans SC", sans-serif;
      transition: background 0.3s ease, color 0.3s ease;
    }
    .dark body {
      background:
        radial-gradient(1200px circle at 10% -10%, hsl(220, 25%, 15%) 0%, transparent 45%),
        radial-gradient(900px circle at 90% -20%, hsl(260, 20%, 15%) 0%, transparent 40%),
        hsl(var(--background));
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
    }
    .status-default { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); }
    .status-pending { background: hsl(var(--muted)); color: hsl(var(--muted-foreground)); }
    .status-info { background: hsl(var(--info-muted)); color: hsl(var(--info)); }
    .status-processing { background: hsl(var(--info-muted)); color: hsl(var(--info)); }
    .status-success { background: hsl(var(--success-muted)); color: hsl(var(--success)); }
    .status-completed { background: hsl(var(--success-muted)); color: hsl(var(--success)); }
    .status-error { background: hsl(var(--danger-muted)); color: hsl(var(--danger)); }
    .status-failed { background: hsl(var(--danger-muted)); color: hsl(var(--danger)); }
    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fade-up {
      0% { opacity: 0; transform: translateY(12px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .page-enter { animation: fade-up 0.5s ease forwards; }
    .stagger-1 { animation-delay: 0.04s; }
    .stagger-2 { animation-delay: 0.08s; }
    .article h1 { font-size: 2.1rem; font-weight: 800; margin-bottom: 1.5rem; color: hsl(var(--foreground)); }
    .article h2 { font-size: 1.4rem; font-weight: 700; margin: 2rem 0 1rem; color: hsl(var(--primary)); }
    .article p { margin-bottom: 1.1rem; line-height: 1.8; color: hsl(var(--muted-foreground)); }
    .article img { border-radius: 10px; margin: 16px 0; max-width: 100%; box-shadow: var(--shadow); }

    /* Form Components */
    .form-input {
      display: flex;
      height: 2.75rem;
      width: 100%;
      border-radius: 0.375rem;
      border: 1px solid hsl(var(--border));
      background: hsl(var(--background));
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .form-input::placeholder { color: hsl(var(--muted-foreground)); }
    .form-input:focus {
      outline: none;
      ring: 2px solid hsl(var(--ring));
      ring-offset: 2px;
      ring-offset-color: hsl(var(--background));
    }
    .form-textarea {
      width: 100%;
      border-radius: 0.375rem;
      border: 1px solid hsl(var(--border));
      background: hsl(var(--background));
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    }
    .form-textarea::placeholder { color: hsl(var(--muted-foreground)); }
    .form-textarea:focus { outline: none; }
    .form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: hsl(var(--foreground));
      margin-bottom: 0.25rem;
    }
    .btn-primary {
      display: inline-flex;
      height: 2.75rem;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      font-size: 0.875rem;
      font-weight: 600;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      transition: background 0.2s;
      padding: 0 1.25rem;
    }
    .btn-primary:hover { background: hsl(var(--primary) / 0.9); }
    .btn-secondary {
      display: inline-flex;
      height: 2.5rem;
      align-items: center;
      justify-content: center;
      border-radius: 0.375rem;
      border: 1px solid hsl(var(--border));
      color: hsl(var(--muted-foreground));
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 0.2s;
      padding: 0 1rem;
    }
    .btn-secondary:hover { color: hsl(var(--foreground)); border-color: hsl(var(--foreground) / 0.4); }

    /* Modal */
    .modal-overlay { background: rgba(30, 45, 35, 0.5); }
    .modal-content { background: hsl(var(--card)); }
    .modal-header { background: hsl(var(--muted)); }
    .dark .modal-overlay { background: rgba(0, 0, 0, 0.7); }

    /* Skeleton Loading */
    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: skeleton-loading 1.5s infinite;
      border-radius: 4px;
    }
    .dark .skeleton {
      background: linear-gradient(90deg, hsl(220, 15%, 20%) 25%, hsl(220, 15%, 25%) 50%, hsl(220, 15%, 20%) 75%);
      background-size: 200% 100%;
    }
    @keyframes skeleton-loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .skeleton-card {
      padding: 16px 20px;
      border-radius: 8px;
      border: 1px solid hsl(var(--border));
      background: hsl(var(--card));
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .skeleton-title { width: 180px; height: 20px; }
    .skeleton-badge { width: 60px; height: 22px; border-radius: 11px; }
    .skeleton-text { width: 250px; height: 14px; margin-top: 8px; }
    .skeleton-btn { width: 60px; height: 28px; border-radius: 4px; }

    /* Theme Toggle Button */
    .theme-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.375rem;
      border: 1px solid hsl(var(--border));
      background: transparent;
      color: hsl(var(--muted-foreground));
      cursor: pointer;
      transition: all 0.2s;
    }
    .theme-toggle:hover {
      color: hsl(var(--foreground));
      border-color: hsl(var(--foreground) / 0.4);
    }

    /* Task Progress Indicator */
    .progress-bar {
      height: 4px;
      background: hsl(var(--muted));
      border-radius: 2px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-bar-fill {
      height: 100%;
      background: hsl(var(--primary));
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    .progress-bar-fill.animated {
      width: 30%;
      animation: progress-pulse 2s ease-in-out infinite;
    }
    @keyframes progress-pulse {
      0%, 100% { width: 30%; margin-left: 0; }
      50% { width: 50%; margin-left: 25%; }
    }
    .progress-bar-fill.pending {
      width: 10%;
      animation: progress-pending 1.5s ease-in-out infinite;
    }
    @keyframes progress-pending {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.7; }
    }
  </style>
</head>
<body class="min-h-screen bg-background text-foreground">
  ${props.body}
</body>
</html>
`

const getAuthPayload = async (c: { req: { header: (name: string) => string | undefined } }, secret: string) => {
  const auth = c.req.header('Authorization')
  if (!auth) return null
  const [scheme, token] = auth.split(' ')
  if (scheme !== 'Bearer' || !token) return null
  try {
    const payload = (await verify(token, secret)) as AuthPayload
    if (!payload?.id) return null
    return payload
  } catch {
    return null
  }
}

const getQueryToken = (url: URL) => {
  const token = url.searchParams.get('token')
  if (!token) return null
  return token
}

const normalizeString = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
const pickBodyString = (body: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = body[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

// Error tracking helper - can be extended to use Sentry
const trackError = (error: Error, context: Record<string, unknown> = {}) => {
  const errorData = {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  }

  // Log error with structured data
  console.error('[Error]', JSON.stringify(errorData))

  // If Sentry is configured via environment variable, this would integrate:
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context })
  // }
}

// Global error handler for Zod validation errors
app.onError((err, c) => {
  const requestContext = {
    method: c.req.method,
    path: c.req.path,
    userAgent: c.req.header('User-Agent'),
  }

  if (err instanceof z.ZodError) {
    const firstError = err.errors[0]
    return c.json({ error: firstError?.message || '参数验证失败' }, 400)
  }

  // Track unexpected errors
  trackError(err as Error, requestContext)

  return c.json({ error: '服务器错误' }, 500)
})

app.get('/health', (c) => c.json({ ok: true }))

// PWA Manifest
app.get('/manifest.json', (c) => {
  return c.json({
    name: 'AI 写作中台',
    short_name: 'AI写作',
    description: 'AI 智能写作中台 - 异步生成文章，自动存档管理',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f3eb',
    theme_color: '#4a7c59',
    icons: [
      {
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✍️</text></svg>',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✍️</text></svg>',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
    categories: ['productivity', 'utilities'],
    lang: 'zh-CN',
  })
})

// 登录页
app.get('/', (c) =>
  c.html(
    Layout({
      title: '登录',
      body: html`
        <div class="min-h-screen flex items-center justify-center px-4 py-12 relative">
          <button onclick="toggleTheme()" class="theme-toggle absolute top-4 right-4" title="切换主题">
            <svg id="icon-sun" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
            <svg id="icon-moon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
            </svg>
          </button>
          <div class="w-full max-w-md space-y-8 page-enter">
            <div class="space-y-2 text-center">
              <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">Media Ops</p>
              <h1 class="text-3xl font-semibold tracking-tight">AI 写作中台</h1>
              <p class="text-sm text-muted-foreground">登录后即可异步生成与归档文章</p>
            </div>
            <div class="rounded-xl border border-border bg-card p-8 shadow-sm">
              <form id="loginForm" class="space-y-4">
                <input type="text" name="username" placeholder="用户名" class="form-input" />
                <input type="password" name="code" placeholder="访问码" class="form-input" />
                <button type="submit" class="btn-primary w-full">进入后台</button>
              </form>
              <div id="msg" class="text-[hsl(var(--danger))] text-center mt-4 text-sm font-medium"></div>
            </div>
          </div>
        </div>
        <script>
          function toggleTheme() {
            const html = document.documentElement;
            const isDark = html.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons();
          }

          function updateThemeIcons() {
            const isDark = document.documentElement.classList.contains('dark');
            const sunIcon = document.getElementById('icon-sun');
            const moonIcon = document.getElementById('icon-moon');
            if (sunIcon && moonIcon) {
              sunIcon.classList.toggle('hidden', !isDark);
              moonIcon.classList.toggle('hidden', isDark);
            }
          }

          document.addEventListener('DOMContentLoaded', updateThemeIcons);

          document.getElementById('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const res = await fetch('/api/login', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.token) {
              localStorage.setItem('token', data.token);
              window.location.href = '/dashboard';
            } else {
              document.getElementById('msg').innerText = '账号或访问码错误';
            }
          }
        </script>
      `,
    })
  )
)

// 仪表盘
app.get('/dashboard', (c) =>
  c.html(
    Layout({
      title: '文章列表',
      body: html`
        <div class="max-w-6xl mx-auto py-12 px-4 page-enter">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div class="space-y-2">
              <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">Workspace</p>
              <h1 class="text-3xl font-semibold tracking-tight">我的文章库</h1>
              <p class="text-sm text-muted-foreground">异步生成，自动存档</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <button onclick="openModal()" class="btn-primary">新建任务</button>
              <button onclick="toggleTheme()" class="theme-toggle" title="切换主题">
                <svg id="icon-sun" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                </svg>
                <svg id="icon-moon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                </svg>
              </button>
              <button onclick="logout()" class="btn-secondary">退出</button>
            </div>
          </div>

          <div id="batch-actions" class="hidden mb-4 p-3 bg-card rounded-lg border border-border flex items-center gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" id="select-all" onchange="toggleSelectAll()" class="w-4 h-4 rounded border-border" />
              <span class="text-sm font-medium">全选</span>
            </label>
            <span id="selected-count" class="text-sm text-muted-foreground">已选择 0 项</span>
            <div class="flex-1"></div>
            <button onclick="batchRetry()" class="btn-secondary text-sm">批量重试</button>
            <button onclick="batchDelete()" class="btn-secondary text-sm" style="color: hsl(var(--danger));">批量删除</button>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              id="search-input"
              type="text"
              class="form-input flex-1"
              placeholder="搜索主题或关键字..."
              oninput="handleSearch()"
            />
            <select id="status-filter" class="form-input sm:w-40" onchange="handleFilter()">
              <option value="">全部状态</option>
              <option value="processing">生成中</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          <div id="taskListWrapper">
            <div id="skeleton-loader" class="space-y-3">
              <div class="skeleton-card"><div class="flex-1"><div class="flex items-center gap-3"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-badge"></div></div><div class="skeleton skeleton-text"></div></div><div class="skeleton skeleton-btn"></div></div>
              <div class="skeleton-card"><div class="flex-1"><div class="flex items-center gap-3"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-badge"></div></div><div class="skeleton skeleton-text"></div></div><div class="skeleton skeleton-btn"></div></div>
              <div class="skeleton-card"><div class="flex-1"><div class="flex items-center gap-3"><div class="skeleton skeleton-title"></div><div class="skeleton skeleton-badge"></div></div><div class="skeleton skeleton-text"></div></div><div class="skeleton skeleton-btn"></div></div>
            </div>
            <a2-ui id="task-renderer" class="hidden"></a2-ui>
          </div>
          <div id="pagination" class="flex items-center justify-center gap-2 mt-6 hidden">
            <button id="btn-prev" onclick="prevPage()" class="btn-secondary" disabled>上一页</button>
            <span id="page-info" class="text-sm text-muted-foreground px-4"></span>
            <button id="btn-next" onclick="nextPage()" class="btn-secondary">下一页</button>
          </div>
        </div>

        <div id="modal" class="fixed inset-0 hidden items-center justify-center z-50 px-4 py-8 modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="rounded-2xl shadow-2xl w-full max-w-2xl border border-border flex flex-col max-h-full modal-content">
            <div class="px-6 py-4 border-b border-border flex justify-between items-center flex-shrink-0 modal-header">
              <div>
                <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">New Task</p>
                <h3 id="modal-title" class="font-semibold text-lg">新建生成任务</h3>
              </div>
              <button onclick="closeModal()" class="text-muted-foreground hover:text-foreground text-2xl" aria-label="关闭弹窗">&times;</button>
            </div>
            <div class="flex border-b border-border flex-shrink-0 modal-content">
              <button id="tab-article" onclick="switchTab('article')" class="flex-1 px-4 py-3 text-sm font-semibold border-b-2 border-primary text-foreground">文章配置</button>
              <button id="tab-cover" onclick="switchTab('cover')" class="flex-1 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground">封面配置</button>
            </div>
            <div class="flex-1 overflow-y-auto min-h-0 modal-content">
              <div id="panel-article" class="p-6 space-y-5">
                <div>
                  <label class="form-label">主题</label>
                  <input id="topic" type="text" class="form-input" placeholder="请输入文章主题" />
                </div>
                <div>
                  <label class="form-label">关键字</label>
                  <input id="keywords" type="text" class="form-input" placeholder="多个关键词用逗号分隔" />
                </div>
                <div>
                  <label class="form-label">写作风格</label>
                  <textarea id="style" rows="4" class="form-textarea" placeholder="可留空则使用环境变量 WRITING_STYLE_TEMPLATE"></textarea>
                </div>
                <div>
                  <label class="form-label">开场范例</label>
                  <textarea id="openingExample" rows="3" class="form-textarea" placeholder="可留空则使用环境变量 OPENING_EXAMPLE"></textarea>
                </div>
                <div>
                  <label class="form-label">结构骨架</label>
                  <textarea id="structureGuide" rows="3" class="form-textarea" placeholder="可留空则使用环境变量 STRUCTURE_GUIDE"></textarea>
                </div>
                <div>
                  <label class="form-label">输出结构</label>
                  <textarea id="outputSchema" rows="3" class="form-textarea" placeholder="可留空则使用环境变量 OUTPUT_SCHEMA"></textarea>
                </div>
              </div>
              <div id="panel-cover" class="p-6 space-y-5 hidden">
                <div>
                  <label class="form-label">封面提示词</label>
                  <textarea id="coverPrompt" rows="4" class="form-textarea" placeholder="描述封面图片风格，如：科技感、扁平插画、3D渲染等"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="form-label">图片比例</label>
                    <select id="coverRatio" class="form-input">
                      <option value="16:9">16:9 (横屏)</option>
                      <option value="1:1">1:1 (方形)</option>
                      <option value="4:3">4:3</option>
                      <option value="3:4">3:4</option>
                      <option value="9:16">9:16 (竖屏)</option>
                      <option value="21:9">21:9 (超宽)</option>
                    </select>
                  </div>
                  <div>
                    <label class="form-label">分辨率</label>
                    <select id="coverResolution" class="form-input">
                      <option value="1k">1K (推荐)</option>
                      <option value="2k">2K</option>
                      <option value="4k">4K</option>
                    </select>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="form-label">模型</label>
                    <select id="coverModel" class="form-input">
                      <option value="jimeng-4.5">jimeng-4.5 (推荐)</option>
                      <option value="jimeng-4.0">jimeng-4.0</option>
                      <option value="jimeng-4.1">jimeng-4.1</option>
                      <option value="jimeng-3.1">jimeng-3.1</option>
                      <option value="jimeng-3.0">jimeng-3.0</option>
                    </select>
                  </div>
                  <div>
                    <label class="form-label">生图模式</label>
                    <select id="coverMode" class="form-input">
                      <option value="text2img">文生图</option>
                      <option value="single_img2img">单图生图</option>
                      <option value="multi_img2img">多图生图</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="form-label">负面提示词</label>
                  <input id="coverNegativePrompt" type="text" class="form-input" placeholder="模糊, 变形, 低质量, 水印, 文字" value="模糊, 变形, 低质量, 水印, 文字" />
                </div>
              </div>
            </div>
            <div class="px-6 py-4 flex justify-end gap-3 border-t border-border flex-shrink-0 modal-header">
              <button onclick="closeModal()" class="btn-secondary">取消</button>
              <button onclick="submitTask()" id="btn-submit" class="btn-primary">提交任务</button>
            </div>
          </div>
        </div>

        <script>
          // Global error handler for frontend
          window.onerror = function(message, source, lineno, colno, error) {
            console.error('[Frontend Error]', JSON.stringify({
              message: message,
              source: source,
              line: lineno,
              column: colno,
              stack: error?.stack,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent
            }));
            return false;
          };

          window.addEventListener('unhandledrejection', function(event) {
            console.error('[Unhandled Promise Rejection]', JSON.stringify({
              reason: event.reason?.message || String(event.reason),
              stack: event.reason?.stack,
              timestamp: new Date().toISOString()
            }));
          });

          const token = localStorage.getItem('token');
          if (!token) window.location.href = '/';

          let currentPage = 1;
          const pageSize = 10;
          let totalPages = 1;
          let searchQuery = '';
          let statusFilter = '';
          let searchTimeout = null;
          let selectedTasks = new Set();
          let allTaskIds = [];

          // --- Custom A2UI Renderer Implementation ---
          class A2UIRenderer extends HTMLElement {
            constructor() {
              super();
            }

            set data(value) {
              this._data = value;
              this.render();
            }

            render() {
              this.innerHTML = '';
              if (!this._data) return;
              this.appendChild(this.createNode(this._data));
            }

            createNode(node) {
              if (Array.isArray(node)) {
                const fragment = document.createDocumentFragment();
                node.forEach(n => fragment.appendChild(this.createNode(n)));
                return fragment;
              }

              const el = document.createElement('div');
              
              // Apply styles
              if (node.style) {
                Object.assign(el.style, node.style);
              }

              // Render based on type
              switch (node.type) {
                case 'column':
                  el.style.display = 'flex';
                  el.style.flexDirection = 'column';
                  break;
                case 'row':
                  el.style.display = 'flex';
                  el.style.flexDirection = 'row';
                  break;
                case 'text':
                  const tag = node.variant === 'h3' ? 'h3' : 'span';
                  const textEl = document.createElement(tag);
                  textEl.textContent = node.text;
                  if (node.style) Object.assign(textEl.style, node.style);
                  if (node.variant === 'h3') {
                     textEl.className = 'text-lg font-semibold text-foreground';
                  }
                  return textEl;
                case 'card':
                  el.className = 'bg-card p-6 rounded-xl shadow-sm border border-border transition hover:shadow-lg';
                  break;
                case 'tabs':
                  el.style.display = 'flex';
                  el.style.flexDirection = 'column';
                  const tabId = 'tabs-' + Math.random().toString(36).substr(2, 9);
                  // Tab headers
                  const tabHeaders = document.createElement('div');
                  tabHeaders.style.cssText = 'display: flex; border-bottom: 1px solid #e5e7eb; margin-bottom: 12px;';
                  // Tab panels container
                  const tabPanels = document.createElement('div');
                  tabPanels.style.cssText = 'height: 120px; overflow-y: auto;';

                  node.tabs.forEach((tab, index) => {
                    const tabBtn = document.createElement('button');
                    tabBtn.textContent = tab.label;
                    tabBtn.style.cssText = 'padding: 8px 16px; font-size: 13px; font-weight: 500; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; color: #6b7280; transition: all 0.2s;';
                    if (index === 0) {
                      tabBtn.style.borderBottomColor = '#4a7c59';
                      tabBtn.style.color = '#1f2937';
                    }
                    tabBtn.dataset.tabIndex = index;
                    tabBtn.dataset.tabId = tabId;

                    const panel = document.createElement('div');
                    panel.dataset.panelIndex = index;
                    panel.dataset.tabId = tabId;
                    panel.style.display = index === 0 ? 'block' : 'none';
                    if (tab.content) {
                      panel.appendChild(this.createNode(tab.content));
                    }

                    tabBtn.onclick = () => {
                      document.querySelectorAll('button[data-tab-id="' + tabId + '"]').forEach(b => {
                        b.style.borderBottomColor = 'transparent';
                        b.style.color = '#6b7280';
                      });
                      tabBtn.style.borderBottomColor = '#4a7c59';
                      tabBtn.style.color = '#1f2937';
                      document.querySelectorAll('div[data-tab-id="' + tabId + '"]').forEach(p => {
                        p.style.display = 'none';
                      });
                      panel.style.display = 'block';
                    };

                    tabHeaders.appendChild(tabBtn);
                    tabPanels.appendChild(panel);
                  });

                  el.appendChild(tabHeaders);
                  el.appendChild(tabPanels);
                  return el;
                case 'button':
                  const btn = document.createElement('button');
                  btn.textContent = node.text;
                  btn.className = node.variant === 'text'
                    ? 'text-sm font-semibold hover:opacity-80 transition'
                    : 'inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90';

                  if (node.style) Object.assign(btn.style, node.style);

                  if (node.onClick) {
                    btn.onclick = (e) => {
                      e.stopPropagation();
                      const { action, args } = node.onClick;
                      if (window[action]) window[action](...args);
                    };
                  }
                  return btn;
                case 'badge':
                  const badge = document.createElement('span');
                  badge.textContent = node.text;
                  badge.className = 'status-badge status-' + (node.color || 'default');
                  return badge;
                case 'checkbox':
                  const checkbox = document.createElement('input');
                  checkbox.type = 'checkbox';
                  checkbox.className = 'task-checkbox w-4 h-4 rounded border-border cursor-pointer';
                  checkbox.dataset.taskId = node.taskId;
                  checkbox.checked = selectedTasks.has(node.taskId);
                  checkbox.onclick = (e) => {
                    e.stopPropagation();
                    toggleTaskSelection(node.taskId);
                  };
                  return checkbox;
                case 'progress':
                  const progressBar = document.createElement('div');
                  progressBar.className = 'progress-bar';
                  const progressFill = document.createElement('div');
                  progressFill.className = 'progress-bar-fill';
                  if (node.status === 'processing') {
                    progressFill.classList.add('animated');
                  } else if (node.status === 'pending') {
                    progressFill.classList.add('pending');
                  } else if (node.status === 'completed') {
                    progressFill.style.width = '100%';
                    progressFill.style.background = 'hsl(var(--success))';
                  } else if (node.status === 'failed') {
                    progressFill.style.width = '100%';
                    progressFill.style.background = 'hsl(var(--danger))';
                  } else if (node.status === 'cancelled') {
                    progressFill.style.width = '50%';
                    progressFill.style.background = 'hsl(var(--muted-foreground))';
                  }
                  progressBar.appendChild(progressFill);
                  return progressBar;
                case 'container':
                   break;
                default:
                  console.warn('Unknown node type:', node.type);
              }

              if (node.children) {
                if (Array.isArray(node.children)) {
                  node.children.forEach(child => el.appendChild(this.createNode(child)));
                } else {
                  el.appendChild(this.createNode(node.children));
                }
              }

              return el;
            }
          }
          customElements.define('a2-ui', A2UIRenderer);
          // -------------------------------------------

          let isFirstLoad = true;

          async function loadTasks() {
            const skeletonLoader = document.getElementById('skeleton-loader');
            const renderer = document.getElementById('task-renderer');

            // Show skeleton only on first load
            if (isFirstLoad) {
              skeletonLoader.classList.remove('hidden');
              renderer.classList.add('hidden');
            }

            let url = '/api/tasks/a2ui?page=' + currentPage + '&pageSize=' + pageSize;
            if (searchQuery) url += '&q=' + encodeURIComponent(searchQuery);
            if (statusFilter) url += '&status=' + statusFilter;

            const res = await fetch(url, {
              headers: { 'Authorization': 'Bearer ' + token }
            });
            if (res.status === 401) return logout();
            const result = await res.json();

            // Hide skeleton and show content
            skeletonLoader.classList.add('hidden');
            renderer.classList.remove('hidden');
            isFirstLoad = false;

            // Track task IDs for batch operations
            allTaskIds = result.taskIds || [];
            // Remove selected tasks that are no longer in the list
            selectedTasks = new Set([...selectedTasks].filter(id => allTaskIds.includes(id)));
            updateBatchUI();

            if (renderer) {
              renderer.data = result.data;
            }

            // Update pagination
            if (result.pagination) {
              totalPages = result.pagination.totalPages;
              const total = result.pagination.total;
              const paginationEl = document.getElementById('pagination');
              const pageInfo = document.getElementById('page-info');
              const btnPrev = document.getElementById('btn-prev');
              const btnNext = document.getElementById('btn-next');

              if (total > 0) {
                paginationEl.classList.remove('hidden');
                pageInfo.textContent = '第 ' + currentPage + ' / ' + totalPages + ' 页，共 ' + total + ' 条';
                btnPrev.disabled = currentPage <= 1;
                btnNext.disabled = currentPage >= totalPages;
              } else {
                paginationEl.classList.add('hidden');
              }
            }
          }

          function prevPage() {
            if (currentPage > 1) {
              currentPage--;
              loadTasks();
            }
          }

          function nextPage() {
            if (currentPage < totalPages) {
              currentPage++;
              loadTasks();
            }
          }

          function handleSearch() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
              searchQuery = document.getElementById('search-input').value.trim();
              currentPage = 1;
              loadTasks();
            }, 300);
          }

          function handleFilter() {
            statusFilter = document.getElementById('status-filter').value;
            currentPage = 1;
            loadTasks();
          }

          function toggleTaskSelection(taskId) {
            if (selectedTasks.has(taskId)) {
              selectedTasks.delete(taskId);
            } else {
              selectedTasks.add(taskId);
            }
            updateBatchUI();
          }

          function toggleSelectAll() {
            const selectAllCheckbox = document.getElementById('select-all');
            if (selectAllCheckbox.checked) {
              allTaskIds.forEach(id => selectedTasks.add(id));
            } else {
              selectedTasks.clear();
            }
            // Update all checkboxes
            document.querySelectorAll('.task-checkbox').forEach(cb => {
              cb.checked = selectAllCheckbox.checked;
            });
            updateBatchUI();
          }

          function updateBatchUI() {
            const batchActions = document.getElementById('batch-actions');
            const selectedCount = document.getElementById('selected-count');
            const selectAllCheckbox = document.getElementById('select-all');

            if (allTaskIds.length > 0) {
              batchActions.classList.remove('hidden');
            } else {
              batchActions.classList.add('hidden');
            }

            selectedCount.textContent = '已选择 ' + selectedTasks.size + ' 项';
            selectAllCheckbox.checked = allTaskIds.length > 0 && selectedTasks.size === allTaskIds.length;
            selectAllCheckbox.indeterminate = selectedTasks.size > 0 && selectedTasks.size < allTaskIds.length;

            // Update individual checkboxes
            document.querySelectorAll('.task-checkbox').forEach(cb => {
              cb.checked = selectedTasks.has(cb.dataset.taskId);
            });
          }

          async function batchDelete() {
            if (selectedTasks.size === 0) {
              alert('请先选择要删除的任务');
              return;
            }
            if (!confirm('确定要删除选中的 ' + selectedTasks.size + ' 个任务吗？此操作不可恢复。')) return;

            try {
              const res = await fetch('/api/tasks/batch/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ ids: Array.from(selectedTasks) })
              });
              if (res.ok) {
                const result = await res.json();
                selectedTasks.clear();
                loadTasks();
                if (result.deleted > 0) {
                  // Success - tasks deleted
                }
              } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || '批量删除失败，请稍后重试');
              }
            } catch (e) {
              alert('网络连接失败，请检查网络后重试');
            }
          }

          async function batchRetry() {
            if (selectedTasks.size === 0) {
              alert('请先选择要重试的任务');
              return;
            }

            try {
              const res = await fetch('/api/tasks/batch/retry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ ids: Array.from(selectedTasks) })
              });
              if (res.ok) {
                const result = await res.json();
                selectedTasks.clear();
                loadTasks();
                if (result.retried === 0) {
                  alert('没有可重试的任务（只有失败或已取消的任务可以重试）');
                }
              } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || '批量重试失败，请稍后重试');
              }
            } catch (e) {
              alert('网络连接失败，请检查网络后重试');
            }
          }

          // Global handlers for A2UI actions
          window.handleTaskAction = async (action, taskId) => {
             if (action === 'view') {
                window.location.href = '/article/' + taskId + '?token=' + token;
             } else if (action === 'cancel') {
                cancelTask(taskId);
             } else if (action === 'retry') {
                openModalWithTask(taskId);
             } else if (action === 'delete') {
                deleteTask(taskId);
             }
          };

          async function submitTask() {
            const btn = document.getElementById('btn-submit');
            btn.disabled = true;
            btn.innerText = '提交中...';

            const payload = {
              '主题': document.getElementById('topic').value,
              '关键字': document.getElementById('keywords').value,
              '写作风格': document.getElementById('style').value,
              '开场范例': document.getElementById('openingExample').value,
              '结构骨架': document.getElementById('structureGuide').value,
              '输出结构': document.getElementById('outputSchema').value,
              '封面提示词': document.getElementById('coverPrompt').value,
              '封面比例': document.getElementById('coverRatio').value,
              '封面分辨率': document.getElementById('coverResolution').value,
              '封面模型': document.getElementById('coverModel').value,
              '封面模式': document.getElementById('coverMode').value,
              '封面负面提示词': document.getElementById('coverNegativePrompt').value
            };

            try {
              const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(payload)
              });
              if (res.ok) {
                closeModal();
                loadTasks();
              } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || '提交失败，请稍后重试');
              }
            } catch (e) {
              alert('网络连接失败，请检查网络后重试');
            } finally {
              btn.disabled = false;
              btn.innerText = '提交任务';
            }
          }

          function openModal(isRegenerate = false) {
            document.getElementById('modal').classList.remove('hidden');
            document.getElementById('modal').classList.add('flex');
            const modalTitle = document.getElementById('modal-title');
            if (modalTitle) {
              modalTitle.textContent = isRegenerate ? '重新生成任务' : '新建生成任务';
            }
            switchTab('article');
          }

          function closeModal() {
            document.getElementById('modal').classList.add('hidden');
            document.getElementById('modal').classList.remove('flex');
            // Clear form when closing
            clearForm();
          }

          function clearForm() {
            document.getElementById('topic').value = '';
            document.getElementById('keywords').value = '';
            document.getElementById('style').value = '';
            document.getElementById('openingExample').value = '';
            document.getElementById('structureGuide').value = '';
            document.getElementById('outputSchema').value = '';
            document.getElementById('coverPrompt').value = '';
            document.getElementById('coverRatio').value = '16:9';
            document.getElementById('coverResolution').value = '2k';
            document.getElementById('coverModel').value = 'jimeng-4.5';
            document.getElementById('coverMode').value = 'text2img';
            document.getElementById('coverNegativePrompt').value = '模糊, 变形, 低质量, 水印, 文字';
          }

          async function openModalWithTask(taskId) {
            try {
              const res = await fetch('/api/tasks/' + taskId, {
                headers: { 'Authorization': 'Bearer ' + token }
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || '获取任务信息失败');
                return;
              }
              const task = await res.json();

              // Pre-fill form with task data
              document.getElementById('topic').value = task.topic || '';
              document.getElementById('keywords').value = task.keywords || '';
              document.getElementById('style').value = task.style || '';
              document.getElementById('openingExample').value = task.openingExample || '';
              document.getElementById('structureGuide').value = task.structureGuide || '';
              document.getElementById('outputSchema').value = task.outputSchema || '';
              document.getElementById('coverPrompt').value = task.coverPrompt || '';
              document.getElementById('coverRatio').value = task.coverRatio || '16:9';
              document.getElementById('coverResolution').value = task.coverResolution || '2k';
              document.getElementById('coverModel').value = task.coverModel || 'jimeng-4.5';
              document.getElementById('coverMode').value = task.coverMode || 'text2img';
              document.getElementById('coverNegativePrompt').value = task.coverNegativePrompt || '模糊, 变形, 低质量, 水印, 文字';

              // Open modal in regenerate mode
              openModal(true);
            } catch (e) {
              alert('网络错误');
            }
          }
          function switchTab(tab) {
            const articleTab = document.getElementById('tab-article');
            const coverTab = document.getElementById('tab-cover');
            const articlePanel = document.getElementById('panel-article');
            const coverPanel = document.getElementById('panel-cover');
            if (tab === 'article') {
              articleTab.className = 'flex-1 px-4 py-3 text-sm font-semibold border-b-2 border-primary text-foreground';
              coverTab.className = 'flex-1 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground';
              articlePanel.classList.remove('hidden');
              coverPanel.classList.add('hidden');
            } else {
              coverTab.className = 'flex-1 px-4 py-3 text-sm font-semibold border-b-2 border-primary text-foreground';
              articleTab.className = 'flex-1 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground';
              coverPanel.classList.remove('hidden');
              articlePanel.classList.add('hidden');
            }
          }
          function logout() { localStorage.removeItem('token'); window.location.href = '/'; }

          function toggleTheme() {
            const html = document.documentElement;
            const isDark = html.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons();
          }

          function updateThemeIcons() {
            const isDark = document.documentElement.classList.contains('dark');
            const sunIcon = document.getElementById('icon-sun');
            const moonIcon = document.getElementById('icon-moon');
            if (sunIcon && moonIcon) {
              sunIcon.classList.toggle('hidden', !isDark);
              moonIcon.classList.toggle('hidden', isDark);
            }
          }

          // Initialize theme icons on page load
          document.addEventListener('DOMContentLoaded', updateThemeIcons);

          async function cancelTask(taskId) {
            if (!confirm('确定要取消该任务吗？')) return;
            try {
              const res = await fetch('/api/tasks/' + taskId + '/cancel', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }
              });
              if (res.ok) {
                loadTasks();
              } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || '取消失败，任务可能已完成或已取消');
              }
            } catch (e) {
              alert('网络连接失败，请检查网络后重试');
            }
          }

          async function deleteTask(taskId) {
            if (!confirm('确定要删除该任务吗？此操作不可恢复。')) return;
            try {
              const res = await fetch('/api/tasks/' + taskId, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
              });
              if (res.ok) {
                loadTasks();
              } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || '删除失败，请稍后重试');
              }
            } catch (e) {
              alert('网络连接失败，请检查网络后重试');
            }
          }

          loadTasks();
          setInterval(loadTasks, 5000);
        </script>
      `,
    })
  )
)

// 文章详情页
app.get('/article/:id', async (c) => {
  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return c.text('文章不存在', 404)

  const url = new URL(c.req.url)
  const token = getQueryToken(url)
  if (!token) return c.redirect('/')

  let payload: AuthPayload | null = null
  try {
    payload = (await verify(token, c.env.JWT_SECRET)) as AuthPayload
  } catch {
    payload = null
  }
  if (!payload?.id) return c.redirect('/')

  const db = drizzle(c.env.DB)
  const [task] = await db
    .select()
    .from(tasks)
    .where(sql`${tasks.id} = ${id} AND ${tasks.userId} = ${payload.id}`)
    .limit(1)

  if (!task || !task.resultContent) return c.text('文章未找到或尚未生成', 404)

  const articleId = id
  const articleTitle = task.resultTitle || '文章'

  return c.html(
    Layout({
      title: task.resultTitle || '文章详情',
      body: html`
        <div class="max-w-3xl mx-auto py-12 px-6 page-enter">
          <div class="mb-6 flex items-center justify-between">
            <a href="/dashboard" class="text-sm font-medium text-muted-foreground hover:text-foreground">返回列表</a>
            <div class="flex gap-2">
              <button onclick="exportArticle('html')" class="btn-secondary text-sm">导出 HTML</button>
              <button onclick="exportArticle('markdown')" class="btn-secondary text-sm">导出 Markdown</button>
              <button onclick="exportArticle('text')" class="btn-secondary text-sm">导出纯文本</button>
            </div>
          </div>
          <div id="article-content" class="bg-card p-10 rounded-2xl shadow-sm border border-border article">
            ${raw(task.resultContent)}
          </div>
        </div>
        <script>
          const articleId = '${articleId}';
          const articleTitle = '${articleTitle.replace(/'/g, "\\'")}';
          const token = new URLSearchParams(window.location.search).get('token');

          async function exportArticle(format) {
            try {
              const res = await fetch('/api/tasks/' + articleId + '/export?format=' + format, {
                headers: { 'Authorization': 'Bearer ' + token }
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || '导出失败');
                return;
              }

              const blob = await res.blob();
              const extension = format === 'html' ? 'html' : format === 'markdown' ? 'md' : 'txt';
              const filename = articleTitle + '.' + extension;

              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } catch (e) {
              alert('导出失败，请稍后重试');
            }
          }
        </script>
      `,
    })
  )
})

// 登录
app.post('/api/login', async (c) => {
  const body = await c.req.parseBody()
  const username = normalizeString(body['username'])
  const code = normalizeString(body['code'])

  if (!username || !code) return c.json({ error: '缺少参数' }, 400)

  const db = drizzle(c.env.DB)
  const [user] = await db
    .select()
    .from(users)
    .where(sql`${users.username} = ${username} AND ${users.accessCode} = ${code}`)
    .limit(1)

  if (!user) return c.json({ error: '账号或访问码错误' }, 401)

  const token = await sign({ id: user.id }, c.env.JWT_SECRET)
  return c.json({ token })
})

// 获取列表 (A2UI JSON)
app.get('/api/tasks/a2ui', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json({ type: 'text', text: '未授权' }, 401)

  const page = Math.max(1, parseInt(c.req.query('page') || '1'))
  const pageSize = Math.min(50, Math.max(1, parseInt(c.req.query('pageSize') || '10')))
  const offset = (page - 1) * pageSize
  const searchQuery = c.req.query('q') || ''
  const statusFilter = c.req.query('status') || ''

  const db = drizzle(c.env.DB)

  // Build where conditions
  let whereCondition = eq(tasks.userId, payload.id)
  if (statusFilter) {
    whereCondition = sql`${tasks.userId} = ${payload.id} AND ${tasks.status} = ${statusFilter}`
  }
  if (searchQuery) {
    const likePattern = `%${searchQuery}%`
    if (statusFilter) {
      whereCondition = sql`${tasks.userId} = ${payload.id} AND ${tasks.status} = ${statusFilter} AND (${tasks.topic} LIKE ${likePattern} OR ${tasks.keywords} LIKE ${likePattern} OR ${tasks.resultTitle} LIKE ${likePattern})`
    } else {
      whereCondition = sql`${tasks.userId} = ${payload.id} AND (${tasks.topic} LIKE ${likePattern} OR ${tasks.keywords} LIKE ${likePattern} OR ${tasks.resultTitle} LIKE ${likePattern})`
    }
  }

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tasks)
    .where(whereCondition)
  const total = countResult?.count || 0
  const totalPages = Math.ceil(total / pageSize)

  // Get paginated results
  const results = await db
    .select()
    .from(tasks)
    .where(whereCondition)
    .orderBy(desc(tasks.createdAt))
    .limit(pageSize)
    .offset(offset)

  if (results.length === 0 && page === 1) {
    return c.json({
      data: {
        type: 'container',
        style: { padding: '20px', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: '12px' },
        children: [
          { type: 'text', text: '暂无任务，快去创建一个吧！', style: { color: 'var(--muted-foreground)' } }
        ]
      },
      taskIds: [],
      pagination: { page, pageSize, total, totalPages }
    })
  }

  const taskIds = results.map(task => task.id)

  const taskList = {
    type: 'column',
    style: { gap: '12px' },
    children: results.map(task => {
      let statusColor = 'default'
      let statusText = '排队中'
      let actions = []

      if (task.status === 'completed') {
        statusColor = 'success'
        statusText = '已完成'
        actions.push({
          type: 'button',
          text: '查看文章',
          variant: 'text',
          onClick: { action: 'handleTaskAction', args: ['view', task.id] }
        })
      } else if (task.status === 'processing') {
        statusColor = 'info'
        statusText = '生成中'
        actions.push({
          type: 'button',
          text: '取消',
          variant: 'text',
          style: { color: 'hsl(var(--danger))' },
          onClick: { action: 'handleTaskAction', args: ['cancel', task.id] }
        })
      } else if (task.status === 'failed') {
        statusColor = 'error'
        statusText = '失败'
        actions.push({
          type: 'button',
          text: '重试生成',
          variant: 'text',
          onClick: { action: 'handleTaskAction', args: ['retry', task.id] }
        })
      } else if (task.status === 'cancelled') {
        statusColor = 'default'
        statusText = '已取消'
        actions.push({
          type: 'button',
          text: '重新生成',
          variant: 'text',
          onClick: { action: 'handleTaskAction', args: ['retry', task.id] }
        })
      }

      // Add delete button to all tasks
      actions.push({
        type: 'button',
        text: '删除',
        variant: 'text',
        style: { color: 'hsl(var(--muted-foreground))', marginLeft: '8px' },
        onClick: { action: 'handleTaskAction', args: ['delete', task.id] }
      })

      return {
        type: 'row',
        style: {
          padding: '16px 20px',
          borderRadius: '8px',
          border: '1px solid hsl(var(--border))',
          background: 'hsl(var(--card))',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        },
        children: [
          { type: 'checkbox', taskId: task.id },
          {
            type: 'column',
            style: { gap: '2px', flex: '1', minWidth: '0' },
            children: [
              {
                type: 'row',
                style: { gap: '10px', alignItems: 'center' },
                children: [
                  { type: 'text', text: task.resultTitle || task.topic || '未命名任务', style: { fontWeight: '600', fontSize: '15px', color: 'hsl(var(--foreground))' } },
                  { type: 'badge', text: statusText, color: statusColor }
                ]
              },
              {
                type: 'text',
                text: (task.keywords ? '关键字: ' + task.keywords + ' · ' : '') + new Date(task.createdAt || '').toLocaleString('zh-CN', { hour12: false }),
                style: { fontSize: '12px', color: 'hsl(var(--muted-foreground))' }
              },
              { type: 'progress', status: task.status }
            ]
          },
          {
            type: 'row',
            style: { gap: '4px', flexShrink: '0' },
            children: actions
          }
        ]
      }
    })
  }

  return c.json({
    data: taskList,
    taskIds,
    pagination: { page, pageSize, total, totalPages }
  })
})

// 获取单个任务详情
app.get('/api/tasks/:id', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: '未授权' }, 401)

  const id = c.req.param('id')
  if (!id) return c.json({ error: '任务不存在' }, 404)

  const db = drizzle(c.env.DB)
  const [task] = await db
    .select()
    .from(tasks)
    .where(sql`${tasks.id} = ${id} AND ${tasks.userId} = ${payload.id}`)
    .limit(1)

  if (!task) return c.json({ error: '任务不存在' }, 404)

  return c.json(task)
})

// 获取列表
app.get('/api/tasks', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json([], 401)

  const db = drizzle(c.env.DB)
  const results = await db
    .select({
      id: tasks.id,
      topic: tasks.topic,
      keywords: tasks.keywords,
      status: tasks.status,
      resultTitle: tasks.resultTitle,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .where(eq(tasks.userId, payload.id))
    .orderBy(desc(tasks.createdAt))

  return c.json(results ?? [])
})

// 提交新任务
app.post('/api/tasks', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: '未授权' }, 401)

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: '请求体无效' }, 400)
  }

  const topic = pickBodyString(body, ['topic', '主题'])
  if (!topic) return c.json({ error: '主题不能为空' }, 400)

  const keywords = pickBodyString(body, ['keywords', '关键字'])
  const template = pickBodyString(body, ['template'])
  const refUrl = pickBodyString(body, ['url', 'refUrl'])
  const style = pickBodyString(body, ['style', '写作风格'])
  const openingExample = pickBodyString(body, ['openingExample', '开场范例'])
  const structureGuide = pickBodyString(body, ['structureGuide', '结构骨架'])
  const outputSchema = pickBodyString(body, ['outputSchema', '输出结构'])
  const coverPrompt = pickBodyString(body, ['coverPrompt', '封面提示词'])
  const coverRatio = pickBodyString(body, ['coverRatio', '封面比例']) || '16:9'
  const coverResolution = pickBodyString(body, ['coverResolution', '封面分辨率']) || '1k'
  const coverModel = pickBodyString(body, ['coverModel', '封面模型']) || 'jimeng-4.5'
  const coverMode = pickBodyString(body, ['coverMode', '封面模式']) || 'text2img'
  const coverNegativePrompt = pickBodyString(body, ['coverNegativePrompt', '封面负面提示词']) || '模糊, 变形, 低质量, 水印, 文字'

  const db = drizzle(c.env.DB)
  const taskId = crypto.randomUUID()

  await db.insert(tasks).values({
    id: taskId,
    userId: payload.id,
    topic,
    keywords,
    templateId: template,
    refUrl: refUrl,
    status: 'processing',
    style,
    openingExample,
    structureGuide,
    outputSchema,
    coverPrompt,
    coverRatio,
    coverResolution,
    coverModel,
    coverMode,
    coverNegativePrompt,
  })

  const newTaskId = taskId

  c.executionCtx.waitUntil(
    (async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 25000)
        const res = await fetch(c.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: newTaskId,
            topic,
            keywords,
            url: refUrl,
            template,
            style,
            openingExample,
            structureGuide,
            outputSchema,
            coverPrompt,
            coverRatio,
            coverResolution,
            coverModel,
            coverMode,
            coverNegativePrompt,
            主题: topic,
            关键字: keywords,
            写作风格: style,
            开场范例: openingExample,
            结构骨架: structureGuide,
            输出结构: outputSchema,
            封面提示词: coverPrompt,
            封面比例: coverRatio,
            封面分辨率: coverResolution,
            封面模型: coverModel,
            封面模式: coverMode,
            封面负面提示词: coverNegativePrompt,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!res.ok) {
          throw new Error(`n8n webhook error: ${res.status}`)
        }
      } catch (error: unknown) {
        const err = error as Error & { retryable?: boolean }
        if (err.name === 'AbortError' || err.retryable) {
          console.log('n8n webhook 超时，任务继续处理中')
          return
        }
        console.error('触发 n8n 失败', error)
        await db.update(tasks)
          .set({ status: 'failed' })
          .where(sql`${tasks.id} = ${newTaskId} AND ${tasks.userId} = ${payload.id}`)
      }
    })()
  )

  return c.json({ success: true, taskId: newTaskId })
})

// 重试失败任务
app.post('/api/tasks/:id/retry', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: '未授权' }, 401)

  const id = c.req.param('id')
  if (!id) return c.json({ error: '任务不存在' }, 404)

  const db = drizzle(c.env.DB)
  const [task] = await db
    .select()
    .from(tasks)
    .where(sql`${tasks.id} = ${id} AND ${tasks.userId} = ${payload.id}`)
    .limit(1)

  if (!task) return c.json({ error: '任务不存在' }, 404)
  if (task.status !== 'failed' && task.status !== 'cancelled') {
    return c.json({ error: '任务状态不允许重试' }, 400)
  }

  await db.update(tasks)
    .set({ status: 'processing' })
    .where(eq(tasks.id, id))

  c.executionCtx.waitUntil(
    (async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 25000)
        const res = await fetch(c.env.N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskId: task.id,
            topic: task.topic ?? '',
            keywords: task.keywords ?? '',
            url: task.refUrl ?? '',
            template: task.templateId ?? '',
            主题: task.topic ?? '',
            关键字: task.keywords ?? '',
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (!res.ok) {
          throw new Error(`n8n webhook error: ${res.status}`)
        }
      } catch (error: unknown) {
        const err = error as Error & { retryable?: boolean }
        if (err.name === 'AbortError' || err.retryable) {
          console.log('n8n webhook 超时，任务继续处理中')
          return
        }
        console.error('重试触发 n8n 失败', error)
        await db.update(tasks)
          .set({ status: 'failed' })
          .where(eq(tasks.id, task.id))
      }
    })()
  )

  return c.json({ success: true })
})

// 取消任务
app.post('/api/tasks/:id/cancel', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: '未授权' }, 401)

  const id = c.req.param('id')
  if (!id) return c.json({ error: '任务不存在' }, 404)

  const db = drizzle(c.env.DB)
  const [task] = await db
    .select({ id: tasks.id, status: tasks.status })
    .from(tasks)
    .where(sql`${tasks.id} = ${id} AND ${tasks.userId} = ${payload.id}`)
    .limit(1)

  if (!task) return c.json({ error: '任务不存在' }, 404)
  if (task.status !== 'processing' && task.status !== 'pending') {
    return c.json({ error: '任务状态不允许取消' }, 400)
  }

  await db.update(tasks)
    .set({ status: 'cancelled' })
    .where(eq(tasks.id, id))

  return c.json({ success: true })
})

// 删除任务
app.delete('/api/tasks/:id', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: '未授权' }, 401)

  const id = c.req.param('id')
  if (!id) return c.json({ error: '任务不存在' }, 404)

  const db = drizzle(c.env.DB)
  const [task] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(sql`${tasks.id} = ${id} AND ${tasks.userId} = ${payload.id}`)
    .limit(1)

  if (!task) return c.json({ error: '任务不存在' }, 404)

  await db.delete(tasks).where(eq(tasks.id, id))

  return c.json({ success: true })
})

// 导出文章
app.get('/api/tasks/:id/export', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: '未授权' }, 401)

  const id = c.req.param('id')
  if (!id) return c.json({ error: '任务不存在' }, 404)

  const format = c.req.query('format') || 'html'
  if (!['html', 'markdown', 'text'].includes(format)) {
    return c.json({ error: '不支持的导出格式' }, 400)
  }

  const db = drizzle(c.env.DB)
  const [task] = await db
    .select()
    .from(tasks)
    .where(sql`${tasks.id} = ${id} AND ${tasks.userId} = ${payload.id}`)
    .limit(1)

  if (!task) return c.json({ error: '任务不存在' }, 404)
  if (!task.resultContent) return c.json({ error: '文章尚未生成' }, 400)

  const title = task.resultTitle || '未命名文章'
  let content = ''
  let contentType = ''
  let extension = ''

  if (format === 'html') {
    content = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.8; color: #333; }
    h1 { color: #1a1a1a; margin-bottom: 24px; }
    h2 { color: #2d5a3f; margin-top: 32px; }
    p { margin-bottom: 16px; }
    img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
  </style>
</head>
<body>
${task.resultContent}
</body>
</html>`
    contentType = 'text/html; charset=utf-8'
    extension = 'html'
  } else if (format === 'markdown') {
    // Simple HTML to Markdown conversion
    content = task.resultContent
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)\n\n')
      .replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)\n\n')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<ul[^>]*>(.*?)<\/ul>/gis, '$1')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    contentType = 'text/markdown; charset=utf-8'
    extension = 'md'
  } else {
    // Plain text
    content = task.resultContent
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    contentType = 'text/plain; charset=utf-8'
    extension = 'txt'
  }

  const filename = `${title}.${extension}`

  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
})

// 批量删除任务
app.post('/api/tasks/batch/delete', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: '未授权' }, 401)

  let body: { ids?: string[] }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: '请求体无效' }, 400)
  }

  const ids = body.ids
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: '请选择要删除的任务' }, 400)
  }

  if (ids.length > 100) {
    return c.json({ error: '一次最多删除 100 个任务' }, 400)
  }

  const db = drizzle(c.env.DB)

  // Delete all tasks that belong to the user
  let deleted = 0
  for (const id of ids) {
    const result = await db.delete(tasks)
      .where(sql`${tasks.id} = ${id} AND ${tasks.userId} = ${payload.id}`)
    deleted++
  }

  return c.json({ success: true, deleted })
})

// 批量重试任务
app.post('/api/tasks/batch/retry', async (c) => {
  const payload = await getAuthPayload(c, c.env.JWT_SECRET)
  if (!payload) return c.json({ error: '未授权' }, 401)

  let body: { ids?: string[] }
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: '请求体无效' }, 400)
  }

  const ids = body.ids
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: '请选择要重试的任务' }, 400)
  }

  if (ids.length > 50) {
    return c.json({ error: '一次最多重试 50 个任务' }, 400)
  }

  const db = drizzle(c.env.DB)

  // Get all tasks that can be retried (failed or cancelled)
  const tasksToRetry = await db
    .select()
    .from(tasks)
    .where(sql`${tasks.id} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)}) AND ${tasks.userId} = ${payload.id} AND (${tasks.status} = 'failed' OR ${tasks.status} = 'cancelled')`)

  if (tasksToRetry.length === 0) {
    return c.json({ success: true, retried: 0 })
  }

  // Update status to processing
  for (const task of tasksToRetry) {
    await db.update(tasks)
      .set({ status: 'processing' })
      .where(eq(tasks.id, task.id))
  }

  // Trigger n8n webhooks for each task
  c.executionCtx.waitUntil(
    (async () => {
      for (const task of tasksToRetry) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 25000)
          const res = await fetch(c.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              taskId: task.id,
              topic: task.topic ?? '',
              keywords: task.keywords ?? '',
              url: task.refUrl ?? '',
              template: task.templateId ?? '',
              style: task.style ?? '',
              openingExample: task.openingExample ?? '',
              structureGuide: task.structureGuide ?? '',
              outputSchema: task.outputSchema ?? '',
              coverPrompt: task.coverPrompt ?? '',
              coverRatio: task.coverRatio ?? '16:9',
              coverResolution: task.coverResolution ?? '2k',
              coverModel: task.coverModel ?? 'jimeng-4.5',
              coverMode: task.coverMode ?? 'text2img',
              coverNegativePrompt: task.coverNegativePrompt ?? '模糊, 变形, 低质量, 水印, 文字',
              主题: task.topic ?? '',
              关键字: task.keywords ?? '',
              写作风格: task.style ?? '',
              开场范例: task.openingExample ?? '',
              结构骨架: task.structureGuide ?? '',
              输出结构: task.outputSchema ?? '',
              封面提示词: task.coverPrompt ?? '',
              封面比例: task.coverRatio ?? '16:9',
              封面分辨率: task.coverResolution ?? '1k',
              封面模型: task.coverModel ?? 'jimeng-4.5',
              封面模式: task.coverMode ?? 'text2img',
              封面负面提示词: task.coverNegativePrompt ?? '模糊, 变形, 低质量, 水印, 文字',
            }),
            signal: controller.signal,
          })
          clearTimeout(timeoutId)
          if (!res.ok) {
            console.error(`批量重试 n8n webhook error for task ${task.id}: ${res.status}`)
          }
        } catch (error: unknown) {
          const err = error as Error & { retryable?: boolean }
          if (err.name === 'AbortError' || err.retryable) {
            console.log(`批量重试 n8n webhook 超时，任务 ${task.id} 继续处理中`)
            continue
          }
          console.error(`批量重试触发 n8n 失败 for task ${task.id}`, error)
          await db.update(tasks)
            .set({ status: 'failed' })
            .where(eq(tasks.id, task.id))
        }
      }
    })()
  )

  return c.json({ success: true, retried: tasksToRetry.length })
})

export default app
