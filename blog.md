# WP Blog Manager — Project Overview for Claude Code

## What this project is
A multi-project WordPress blog creation and scheduling platform built with Next.js 14. Each "project" is an independent workspace for a different WordPress website. The app uses AI (Claude) to generate blog posts in two passes, manages a Google Drive image pipeline, and auto-publishes via Vercel Cron.

## Owner
Alana — non-technical user. Keep explanations simple and always explain what you changed and why after making edits.

## Tech stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Auth**: NextAuth.js with Google OAuth
- **Database**: Vercel KV (Upstash Redis) — all data stored here, no SQL
- **AI**: Anthropic Claude API (claude-sonnet-4-20250514) — two-pass generation
- **Image processing**: Sharp — resize to 1200x630 WebP, SEO filename
- **Google Drive**: googleapis — image source/used folder pipeline
- **WordPress**: WP REST API with Application Passwords
- **Cron**: Vercel Cron Jobs (vercel.json) + smart background generation

## Project structure
```
app/
  api/
    auth/[...nextauth]/   → Google OAuth
    projects/             → Project CRUD
    posts/                → Post CRUD
    generate/             → Two-pass AI generation
    drive/                → Google Drive image list + process + move
    publish/              → WP REST API publisher + connection test
    ideas/                → Idea bank CRUD
    guidelines/           → Editable brand guidelines
    cron/publish/         → Scheduled publisher + smart idea generator
  page.tsx                → Main app shell (projects → workspace)
  layout.tsx              → Root layout with SessionProvider

lib/
  types.ts                → All TypeScript interfaces
  kv.ts                   → Vercel KV helpers (projects, posts)
  generate.ts             → Two-pass Claude generation engine
  drive.ts                → Google Drive API helpers
  image.ts                → Sharp image processing
  wordpress.ts            → WP REST API helpers

components/
  ProjectsScreen.tsx      → Project card grid
  WorkspaceScreen.tsx     → Tab shell (Dashboard/Compose/Queue/Settings)
  DashboardTab.tsx        → Stats + recent posts
  ComposeTab.tsx          → 3-step post creation flow
  QueueTab.tsx            → Scheduled posts + cron config
  SettingsTab.tsx         → Per-project config (WP, Drive, style, guidelines)
  ImagePicker.tsx         → Google Drive image browser
```

## Key features
1. **Multi-project** — each project has its own WP site, style guide, categories, prompts, Drive folders
2. **Two-pass AI generation** — Pass 1: outline + SEO metadata, Pass 2: full HTML body with up to 3 validation retries. Errors fed back into next attempt.
3. **Content guidelines** — 4 editable brand guideline docs stored in KV, injected into every Claude prompt
4. **Idea bank** — status lifecycle: Idea → Generating → Generated → Published → Skipped
5. **Google Drive image pipeline** — list available images → user picks one → Sharp resizes to 1200x630 WebP → SEO filename → upload to WP media → move original to "used" folder in Drive
6. **CTA extraction** — CTA block stripped from HTML after generation and stored as structured fields (ctaHeadline, ctaDescription, ctaButtonText)
7. **Hero overlay rotation** — purple → green → dark, tracked in project.lastOverlayIndex
8. **Vercel Cron** — GET /api/cron/publish publishes due scheduled posts. POST /api/cron/publish picks next idea from idea bank and generates in background (responds in <1s to avoid timeout)

## Environment variables needed
```
NEXTAUTH_SECRET
NEXTAUTH_URL
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
KV_REST_API_URL
KV_REST_API_TOKEN
ANTHROPIC_API_KEY
CRON_SECRET
```

## Coding preferences
- Always use TypeScript
- Keep components simple and readable — Alana may need to understand them
- Use Tailwind for all styling — no custom CSS files
- Always handle loading and error states in UI components
- After any change, explain in plain English what you changed and why
- Never break existing functionality when adding new features — test mentally before saving
- Keep API routes thin — business logic goes in /lib files

## Data storage pattern
All data lives in Vercel KV (Redis). Pattern:
- `project:{id}` → Project object
- `user:{email}:projects` → Set of project IDs
- `post:{id}` → BlogPost object
- `project:{id}:posts` → Set of post IDs
- `idea:{id}` → BlogIdea object
- `project:{id}:ideas` → Set of idea IDs
- `guideline:{id}` → ContentGuideline object
- `project:{id}:guidelines` → Set of guideline IDs

## Common tasks Alana might ask for
- Adding new fields to the compose form
- UI improvements to any tab
- Fixing bugs in the image picker or Drive integration
- Adding new post statuses or filters
- Improving the AI generation prompts
- Adding export functionality
- Deployment and environment variable updates
