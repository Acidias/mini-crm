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
- `src/db/schema.ts` - Database schema (companies + persons tables)
- `src/db/index.ts` - Drizzle client connection
- `src/actions/companies.ts` - Company CRUD server actions (create, update, delete)
- `src/actions/persons.ts` - Person CRUD + markAsContacted action
- `src/app/` - Pages: dashboard, companies (list/new/edit), persons (list/new/edit)
- `drizzle.config.ts` - Drizzle Kit config for schema push

## Database
- **companies**: name, website, industry, email, phone, address, notes
- **persons**: name, email, phone, position, notes, companyId (FK), lastContactedAt
- Persons can optionally link to a company (ON DELETE SET NULL)
- Schema pushed with `npx drizzle-kit push` (needs DATABASE_URL env var)

## Features
- Dashboard with stats, follow-up reminders (7d threshold), recent additions
- Companies list with person count, full CRUD
- Persons list with last contacted status, mark as contacted button, full CRUD
- Sidebar navigation, light gray CRM-style UI

## Development
- `npm run dev` to start locally
- `.env.local` contains DATABASE_URL (not committed)
