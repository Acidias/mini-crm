@AGENTS.md

# Mini CRM

Contact and company management system with Google OAuth authentication.

## Tech Stack
- Next.js 16 (App Router, server components + server actions)
- Drizzle ORM + @neondatabase/serverless (neon-http driver)
- Auth.js v5 with Google OAuth (only ALLOWED_EMAILS can sign in)
- Resend for email sending/receiving (domain: foundry70.co.uk)
- PostgreSQL on NeonDB (project: noisy-bonus-54925963, org: org-late-tooth-96431301)
- Deployed to Vercel via GitHub auto-deploy (https://mini-crm-rust.vercel.app)
- GitHub: https://github.com/Acidias/mini-crm

## Structure
- `src/db/schema.ts` - Database schema with indexes (companies, persons, events, todos, emails, activities, tags, entityTags)
- `src/db/index.ts` - Drizzle client connection
- `src/auth.ts` - Auth.js config with Google provider + email allowlist
- `src/middleware.ts` - Protects all routes, redirects to /login
- `src/lib/resend.ts` - Resend client, FROM_ADDRESSES config
- `src/lib/validation.ts` - Server-side validation helpers (email, URL, required, clean)
- `src/lib/ai/` - AI chat: system-prompt.ts, tools.ts (31 tool schemas), tool-executor.ts (DB operations)
- `src/components/` - Shared UI: search-input, pagination, sort-header, bulk-actions, confirm-delete, tag-manager, duplicate-warning
- `src/actions/` - Server actions: companies, persons, events, todos, emails, activities, tags
- `src/app/` - Pages: dashboard, ai chat, emails, companies, persons, events, todos, calendar, trash, login
- `src/app/api/ai/chat/` - Streaming AI chat endpoint with agentic tool-use loop
- `src/app/api/bulk/` - Bulk delete/update API routes (persons, companies, todos)
- `src/app/api/check-duplicate/` - Duplicate detection API (persons by email, companies by name)
- `src/app/api/webhooks/resend/` - Inbound email webhook
- `src/scripts/seed.ts` - Database seed script with example data

## Database
- **companies**: name, website, industry, email, phone, address, notes, deletedAt (soft delete)
- **persons**: name, email, phone, position, linkedin, notes, companyId (FK), lastContactedAt, deletedAt (soft delete)
- **events**: name, date, location, description, companyId (FK), status
- **todos**: title, dueDate, done, notes, personId (FK), eventId (FK)
- **emails**: resendId, direction, from/to, subject, body (text+html), personId (FK), read
- **activities**: type (call/meeting/note/email/other), title, notes, personId (FK), companyId (FK)
- **tags**: name (unique), colour
- **entityTags**: tagId (FK), personId (FK), companyId (FK)
- Indexes on all FKs, email, name, date, done columns
- Schema pushed with `npx drizzle-kit push` (needs DATABASE_URL env var)

## Features
- Google OAuth login, restricted to ALLOWED_EMAILS
- Dashboard with stats, follow-up reminders, upcoming events, pending todos
- Search, column sorting, pagination on all list pages
- Company and person detail pages with full profile (info, linked items, activity log, tags)
- Activity log (call notes, meeting notes, etc.) on person and company detail pages
- Tags/labels with colours - assign to persons and companies
- Bulk actions: multi-select delete (persons, companies), bulk mark done/pending (todos)
- AI chat assistant (Claude API) with 31 tools covering all CRUD operations, streaming responses
- Email system: compose with from-address dropdown, inbox, sent, drafts tab, view with reply
- Events with upcoming/past, status management, calendar view
- To-do list linked to persons and events
- Confirmation dialogs on all delete actions
- Duplicate detection on person create (email) and company create (name)
- Server-side form validation (email format, URL format, required fields)
- Soft delete for persons and companies with Trash page (restore or permanent delete)

## Email Setup
- Resend domain: foundry70.co.uk (sending + receiving enabled)
- Webhook: configured to POST to `/api/webhooks/resend`
- FROM_ADDRESSES configurable in `src/lib/resend.ts`
- Inbound requires MX record: `inbound-smtp.resend.com` priority 10

## Development
- `npm run dev` to start locally
- `.env.local`: DATABASE_URL, RESEND_API_KEY, EMAIL_FROM, AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, ALLOWED_EMAILS
- `npx tsx src/scripts/seed.ts` to seed example data
