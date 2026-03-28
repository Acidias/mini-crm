# Mini-CRM Plan

## Status: v2 complete - CRM-style overhaul deployed

## Completed

- [x] Phase 1: Scaffolded Next.js app with TypeScript + Tailwind
- [x] Phase 2: NeonDB project created, schema pushed
- [x] Phase 3: All CRUD pages built
- [x] Phase 4: GitHub repo + Vercel deployment
- [x] v2: CRM-style redesign with sidebar, dashboard, contact tracking

## Links

- GitHub: https://github.com/Acidias/mini-crm
- Live: https://mini-crm-rust.vercel.app
- NeonDB project: noisy-bonus-54925963

## Architecture

- Next.js 16 App Router with server components + server actions
- Drizzle ORM + @neondatabase/serverless (neon-http driver)
- Dark sidebar nav, light gray body, white card panels
- Contact tracking with 7-day follow-up threshold

## Database

- **companies**: name, website, industry, email, phone, address, notes
- **persons**: name, email, phone, position, notes, companyId (FK), lastContactedAt

## Pages

- `/` - Dashboard with stats, follow-up list, recent additions
- `/companies` - List with person counts, add (`/new`), edit (`/[id]/edit`)
- `/persons` - List with last contacted, mark as contacted, add (`/new`), edit (`/[id]/edit`)
