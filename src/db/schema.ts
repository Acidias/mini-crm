import { pgTable, serial, varchar, text, integer, timestamp, date } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 100 }),
  address: varchar("address", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const persons = pgTable("persons", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 100 }),
  position: varchar("position", { length: 255 }),
  notes: text("notes"),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  lastContactedAt: timestamp("last_contacted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  date: date("date").notNull(),
  location: varchar("location", { length: 500 }),
  description: text("description"),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 50 }).notNull().default("upcoming"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
