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
- `src/actions/companies.ts` - Company CRUD server actions
- `src/actions/persons.ts` - Person CRUD server actions
- `src/app/` - Pages: dashboard, companies (list/new/edit), persons (list/new/edit)
- `drizzle.config.ts` - Drizzle Kit config for schema push

## Database
- Two tables: companies and persons
- Persons can optionally link to a company (ON DELETE SET NULL)
- Schema pushed with `npx drizzle-kit push` (needs DATABASE_URL env var)

## Development
- `npm run dev` to start locally
- `.env.local` contains DATABASE_URL (not committed)
