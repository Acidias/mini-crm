# Mini-CRM Plan

## Status: v3 complete - Events, todos, calendar

## Completed

- [x] Phase 1: Scaffolded Next.js app with TypeScript + Tailwind
- [x] Phase 2: NeonDB project created, schema pushed
- [x] Phase 3: All CRUD pages built
- [x] Phase 4: GitHub repo + Vercel deployment
- [x] v2: CRM-style redesign with sidebar, dashboard, contact tracking
- [x] v3: Events, to-do list, calendar, seed data

## Links

- GitHub: https://github.com/Acidias/mini-crm
- Live: https://mini-crm-rust.vercel.app
- NeonDB project: noisy-bonus-54925963

## Database

- **companies**: name, website, industry, email, phone, address, notes
- **persons**: name, email, phone, position, notes, companyId (FK), lastContactedAt
- **events**: name, date, location, description, companyId (FK), status
- **todos**: title, dueDate, done, notes, personId (FK), eventId (FK)

## Pages

- `/` - Dashboard with stats, follow-ups, upcoming events, pending todos
- `/companies` - List with person counts, add, edit
- `/persons` - List with last contacted, mark as contacted, add, edit
- `/events` - Upcoming/past split, status management, add, edit
- `/todos` - Pending/completed split, toggle done, linked to persons/events
- `/calendar` - Monthly view with events (blue) and todos (amber)
