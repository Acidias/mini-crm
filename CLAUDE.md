@AGENTS.md

# Mini CRM

Simple contact and company management system. No authentication.

## Tech Stack
- Next.js 16 (App Router, server components + server actions)
- Drizzle ORM + @neondatabase/serverless (neon-http driver)
- PostgreSQL on NeonDB (project: noisy-bonus-54925963, org: org-late-tooth-96431301)
- Deployed to Vercel via GitHub auto-deploy (https://mini-crm-rust.vercel.app)
- GitHub: https://github.com/Acidias/mini-crm

## Structure
- `src/db/schema.ts` - Database schema (companies, persons, events, todos)
- `src/db/index.ts` - Drizzle client connection
- `src/actions/` - Server actions: companies, persons, events, todos
- `src/app/` - Pages: dashboard, companies, persons, events, todos, calendar
- `src/app/calendar/calendar-view.tsx` - Client component for calendar month navigation
- `src/scripts/seed.ts` - Database seed script with example data
- `drizzle.config.ts` - Drizzle Kit config for schema push

## Database
- **companies**: name, website, industry, email, phone, address, notes
- **persons**: name, email, phone, position, notes, companyId (FK), lastContactedAt
- **events**: name, date, location, description, companyId (FK), status
- **todos**: title, dueDate, done, notes, personId (FK), eventId (FK)
- All FKs use ON DELETE SET NULL
- Schema pushed with `npx drizzle-kit push` (needs DATABASE_URL env var)

## Features
- Dashboard with stats, follow-up reminders, upcoming events, pending todos, recent additions
- Companies list with person count, full CRUD
- Persons list with last contacted status, mark as contacted button, full CRUD
- Events with upcoming/past sections, status (upcoming/attended/cancelled)
- To-do list with done/pending, linked to persons and events
- Monthly calendar showing events and todos with colour-coded badges
- Sidebar navigation, light gray CRM-style UI

## Development
- `npm run dev` to start locally
- `.env.local` contains DATABASE_URL (not committed)
- `npx tsx src/scripts/seed.ts` to seed example data (needs DATABASE_URL)
