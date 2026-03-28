# Mini-CRM Plan

## Status: v4 complete - Email system via Resend (local only)

## Completed

- [x] Phase 1: Scaffolded Next.js app with TypeScript + Tailwind
- [x] Phase 2: NeonDB project created, schema pushed
- [x] Phase 3: All CRUD pages built
- [x] Phase 4: GitHub repo + Vercel deployment
- [x] v2: CRM-style redesign with sidebar, dashboard, contact tracking
- [x] v3: Events, to-do list, calendar, seed data
- [x] v4: Email system - compose, inbox, view, reply via Resend

## Links

- GitHub: https://github.com/Acidias/mini-crm
- Live: https://mini-crm-rust.vercel.app
- NeonDB project: noisy-bonus-54925963

## Database

- **companies**: name, website, industry, email, phone, address, notes
- **persons**: name, email, phone, position, notes, companyId (FK), lastContactedAt
- **events**: name, date, location, description, companyId (FK), status
- **todos**: title, dueDate, done, notes, personId (FK), eventId (FK)
- **emails**: resendId, direction, from/to, subject, body, personId (FK), read

## Pages

- `/` - Dashboard with stats, follow-ups, upcoming events, pending todos
- `/emails` - Inbox/sent list, compose, view email, reply
- `/companies` - List with person counts, add, edit
- `/persons` - List with last contacted, mark as contacted, send email, add, edit
- `/events` - Upcoming/past split, status management, add, edit
- `/todos` - Pending/completed split, toggle done, linked to persons/events
- `/calendar` - Monthly view with events (blue) and todos (amber)

## Inbound Email Setup (pending)

1. Add MX record to foundry70.co.uk: `inbound-smtp.resend.com` priority 10
2. Deploy to Vercel and set RESEND_API_KEY env var
3. Configure webhook in Resend dashboard: `https://mini-crm-rust.vercel.app/api/webhooks/resend`
