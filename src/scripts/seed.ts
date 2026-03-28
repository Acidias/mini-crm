import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { companies, persons, events, todos } from "../db/schema";

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log("Seeding database...");

  // Companies
  const [acme] = await db
    .insert(companies)
    .values({
      name: "Acme Corp",
      industry: "Technology",
      website: "https://acme.example.com",
      email: "info@acme.example.com",
      phone: "+44 20 7946 0958",
      address: "123 Innovation Street, London, EC2A 1AB",
      notes: "Key partner for cloud infrastructure projects.",
    })
    .returning();

  const [globex] = await db
    .insert(companies)
    .values({
      name: "Globex Industries",
      industry: "Manufacturing",
      website: "https://globex.example.com",
      email: "contact@globex.example.com",
      phone: "+44 20 7946 1234",
      address: "45 Factory Lane, Manchester, M1 2AB",
      notes: "Potential client for supply chain software.",
    })
    .returning();

  const [initech] = await db
    .insert(companies)
    .values({
      name: "Initech Solutions",
      industry: "Consulting",
      website: "https://initech.example.com",
      email: "hello@initech.example.com",
      phone: "+44 20 7946 5678",
      notes: "Referred by Sarah from the London tech meetup.",
    })
    .returning();

  console.log("  Companies created: Acme, Globex, Initech");

  // Persons
  const [john] = await db
    .insert(persons)
    .values({
      name: "John Mitchell",
      email: "john@acme.example.com",
      phone: "+44 7700 900123",
      position: "CTO",
      companyId: acme.id,
      lastContactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      notes: "Very interested in our API offering.",
    })
    .returning();

  const [sarah] = await db
    .insert(persons)
    .values({
      name: "Sarah Chen",
      email: "sarah@globex.example.com",
      phone: "+44 7700 900456",
      position: "Head of Operations",
      companyId: globex.id,
      lastContactedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      notes: "Needs follow-up on the proposal we sent.",
    })
    .returning();

  const [alex] = await db
    .insert(persons)
    .values({
      name: "Alex Rivera",
      email: "alex@initech.example.com",
      phone: "+44 7700 900789",
      position: "Senior Consultant",
      companyId: initech.id,
      notes: "Met at the Cloud Summit. No contact yet.",
    })
    .returning();

  const [emma] = await db
    .insert(persons)
    .values({
      name: "Emma Thompson",
      email: "emma.t@outlook.example.com",
      phone: "+44 7700 900012",
      position: "Freelance Designer",
      lastContactedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      notes: "Potential collaborator for the rebrand project.",
    })
    .returning();

  console.log("  Persons created: John, Sarah, Alex, Emma");

  // Events
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const twoMonths = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [summit] = await db
    .insert(events)
    .values({
      name: "Cloud Summit 2026",
      date: nextWeek.toISOString().split("T")[0],
      location: "ExCeL London",
      description: "Annual cloud computing conference. Good networking opportunity.",
      companyId: acme.id,
      status: "upcoming",
    })
    .returning();

  const [demo] = await db
    .insert(events)
    .values({
      name: "Product Demo for Globex",
      date: nextMonth.toISOString().split("T")[0],
      location: "Globex HQ, Manchester",
      description: "Live demo of our supply chain platform for the ops team.",
      companyId: globex.id,
      status: "upcoming",
    })
    .returning();

  await db.insert(events).values({
    name: "Tech Networking Dinner",
    date: twoMonths.toISOString().split("T")[0],
    location: "The Ivy, London",
    description: "Quarterly networking dinner with industry leaders.",
    status: "upcoming",
  });

  await db.insert(events).values({
    name: "Initech Kickoff Meeting",
    date: lastWeek.toISOString().split("T")[0],
    location: "Initech Office",
    description: "Initial meeting to discuss consulting engagement.",
    companyId: initech.id,
    status: "attended",
  });

  console.log("  Events created: Cloud Summit, Product Demo, Networking Dinner, Initech Kickoff");

  // Todos
  const friday = new Date();
  friday.setDate(friday.getDate() + (5 - friday.getDay() + 7) % 7);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  await db.insert(todos).values([
    {
      title: "Follow up with Sarah on the Globex proposal",
      dueDate: tomorrow.toISOString().split("T")[0],
      personId: sarah.id,
      notes: "She mentioned wanting pricing by end of week.",
    },
    {
      title: "Prepare slides for Cloud Summit talk",
      dueDate: nextWeek.toISOString().split("T")[0],
      eventId: summit.id,
      notes: "Focus on serverless architecture case study.",
    },
    {
      title: "Send Alex the integration docs",
      dueDate: inThreeDays.toISOString().split("T")[0],
      personId: alex.id,
    },
    {
      title: "Book travel to Manchester for Globex demo",
      dueDate: friday.toISOString().split("T")[0],
      eventId: demo.id,
    },
    {
      title: "Contact Emma about design brief",
      dueDate: friday.toISOString().split("T")[0],
      personId: emma.id,
      notes: "Discuss scope and timeline for the rebrand.",
    },
    {
      title: "Review Initech meeting notes",
      done: true,
      notes: "Already reviewed and shared with the team.",
    },
  ]);

  console.log("  Todos created: 5 pending + 1 completed");
  console.log("Seeding complete!");
}

seed().catch(console.error);
