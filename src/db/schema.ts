import { pgTable, serial, varchar, text, integer, timestamp, date, boolean, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website: varchar("website", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 100 }),
  address: varchar("address", { length: 500 }),
  notes: text("notes"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const persons = pgTable("persons", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 100 }),
  position: varchar("position", { length: 255 }),
  linkedin: varchar("linkedin", { length: 500 }),
  notes: text("notes"),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "set null",
  }),
  lastContactedAt: timestamp("last_contacted_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("persons_company_id_idx").on(table.companyId),
  index("persons_email_idx").on(table.email),
  index("persons_name_idx").on(table.name),
]);

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
}, (table) => [
  index("events_company_id_idx").on(table.companyId),
  index("events_date_idx").on(table.date),
]);

export const emails = pgTable("emails", {
  id: serial("id").primaryKey(),
  resendId: varchar("resend_id", { length: 255 }),
  direction: varchar("direction", { length: 10 }).notNull(), // "inbound" or "outbound"
  fromAddress: varchar("from_address", { length: 255 }).notNull(),
  toAddress: varchar("to_address", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  personId: integer("person_id").references(() => persons.id, {
    onDelete: "set null",
  }),
  status: varchar("status", { length: 20 }).notNull().default("sent"), // "sent", "draft"
  read: boolean("read").notNull().default(false),
  scheduledAt: timestamp("scheduled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("emails_person_id_idx").on(table.personId),
  index("emails_created_at_idx").on(table.createdAt),
  index("emails_status_idx").on(table.status),
]);

export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  dueDate: date("due_date"),
  done: boolean("done").notNull().default(false),
  notes: text("notes"),
  personId: integer("person_id").references(() => persons.id, {
    onDelete: "set null",
  }),
  eventId: integer("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("todos_person_id_idx").on(table.personId),
  index("todos_event_id_idx").on(table.eventId),
  index("todos_done_idx").on(table.done),
]);

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(), // "call", "meeting", "note", "email", "other"
  title: varchar("title", { length: 255 }).notNull(),
  notes: text("notes"),
  personId: integer("person_id").references(() => persons.id, {
    onDelete: "cascade",
  }),
  companyId: integer("company_id").references(() => companies.id, {
    onDelete: "cascade",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("activities_person_id_idx").on(table.personId),
  index("activities_company_id_idx").on(table.companyId),
]);

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  colour: varchar("colour", { length: 7 }).notNull().default("#6b7280"),
}, (table) => [
  uniqueIndex("tags_name_idx").on(table.name),
]);

export const entityTags = pgTable("entity_tags", {
  id: serial("id").primaryKey(),
  tagId: integer("tag_id").references(() => tags.id, { onDelete: "cascade" }).notNull(),
  personId: integer("person_id").references(() => persons.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "cascade" }),
}, (table) => [
  index("entity_tags_tag_id_idx").on(table.tagId),
  index("entity_tags_person_id_idx").on(table.personId),
  index("entity_tags_company_id_idx").on(table.companyId),
]);

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value").notNull().default(""),
}, (table) => [
  uniqueIndex("settings_key_idx").on(table.key),
]);

export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  keyHash: varchar("key_hash", { length: 64 }).notNull(), // SHA-256 hash
  keyPrefix: varchar("key_prefix", { length: 12 }).notNull(), // "mcrm_xxxx" for display
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("api_keys_hash_idx").on(table.keyHash),
]);

export const chatSessions = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull().default("New Chat"),
  messages: jsonb("messages").notNull().default([]),
  status: varchar("status", { length: 20 }).notNull().default("idle"), // "idle" or "working"
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
