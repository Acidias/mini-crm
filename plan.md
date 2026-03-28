# Mini-CRM Plan

## Status: All phases complete

## Completed

- [x] Phase 1: Scaffolded Next.js app with TypeScript + Tailwind
- [x] Phase 2: NeonDB project created, schema pushed (companies + persons tables)
- [x] Phase 3: All CRUD pages built, build verified
- [x] Phase 4: GitHub repo + Vercel deployment

## Links

- GitHub: https://github.com/Acidias/mini-crm
- Live: https://mini-crm-rust.vercel.app
- NeonDB project: noisy-bonus-54925963

## Architecture
- Next.js 16 App Router with server components + server actions
- Drizzle ORM + @neondatabase/serverless (neon-http driver)
- NeonDB project: noisy-bonus-54925963
- Two tables: companies and persons (linked via FK)

## Pages
- `/` - Dashboard with counts and recent entries
- `/companies` - List, add (`/new`), edit (`/[id]/edit`)
- `/persons` - List, add (`/new`), edit (`/[id]/edit`)
