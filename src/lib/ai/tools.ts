import type Anthropic from "@anthropic-ai/sdk";

type Tool = Anthropic.Messages.Tool;

export const allTools: Tool[] = [
  // ─── WEB: Research ───
  {
    name: "web_fetch",
    description: "Fetch a web page and return its text content. Use this to research people, companies, events from URLs. Works with any public webpage including LinkedIn, Companies House, company websites, event pages, directories, etc. Returns cleaned text extracted from the HTML.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: { type: "string", description: "The URL to fetch (required)" },
      },
      required: ["url"],
    },
  },
  {
    name: "web_search",
    description: "Search the web using Google and return results. Use this to find LinkedIn profiles, company information, contact details, Companies House records, etc. Returns a list of search result titles, URLs, and snippets.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (required)" },
      },
      required: ["query"],
    },
  },
  // ─── READ: Persons ───
  {
    name: "persons_list",
    description: "Search and list persons in the CRM. Returns name, email, phone, position, company name, last contacted date. Excludes soft-deleted.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search by name, email, position, or phone" },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
      },
      required: [],
    },
  },
  {
    name: "persons_get",
    description: "Get a person by ID with their company, recent emails, todos, activities, and tags.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Person ID" },
      },
      required: ["id"],
    },
  },
  // ─── READ: Companies ───
  {
    name: "companies_list",
    description: "Search and list companies. Returns name, industry, website, email, phone, person count. Excludes soft-deleted.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search by name, industry, email, or website" },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
      },
      required: [],
    },
  },
  {
    name: "companies_get",
    description: "Get a company by ID with its persons, events, activities, and tags.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Company ID" },
      },
      required: ["id"],
    },
  },
  // ─── READ: Events ───
  {
    name: "events_list",
    description: "List events. Can filter to upcoming only. Returns name, date, location, status, company name.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search by event name" },
        upcoming_only: { type: "boolean", description: "Only show future events" },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
      },
      required: [],
    },
  },
  {
    name: "events_get",
    description: "Get a single event by ID with its company details.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Event ID" },
      },
      required: ["id"],
    },
  },
  // ─── READ: Todos ───
  {
    name: "todos_list",
    description: "List to-do items. Can filter by done/pending. Returns title, due date, done status, linked person/event.",
    input_schema: {
      type: "object" as const,
      properties: {
        done: { type: "boolean", description: "Filter by completion status" },
        query: { type: "string", description: "Search by title" },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
      },
      required: [],
    },
  },
  {
    name: "todos_get",
    description: "Get a single to-do by ID with linked person and event details.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Todo ID" },
      },
      required: ["id"],
    },
  },
  // ─── READ: Emails ───
  {
    name: "emails_list",
    description: "List emails. Can filter by direction (inbound/outbound) and status (sent/draft).",
    input_schema: {
      type: "object" as const,
      properties: {
        direction: { type: "string", enum: ["inbound", "outbound"], description: "Filter by direction" },
        status: { type: "string", enum: ["sent", "draft"], description: "Filter by status" },
        query: { type: "string", description: "Search by subject, from, or to address" },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
      },
      required: [],
    },
  },
  {
    name: "emails_get",
    description: "Get a single email by ID with full body text and linked person.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Email ID" },
      },
      required: ["id"],
    },
  },
  // ─── READ: Activities ───
  {
    name: "activities_list",
    description: "List activity log entries (calls, meetings, notes). Filter by person or company.",
    input_schema: {
      type: "object" as const,
      properties: {
        person_id: { type: "number", description: "Filter by person ID" },
        company_id: { type: "number", description: "Filter by company ID" },
        limit: { type: "number", description: "Max results (default 20, max 50)" },
      },
      required: [],
    },
  },
  // ─── READ: Tags ───
  {
    name: "tags_list",
    description: "List all tags with their colours.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // ─── WRITE: Persons ───
  {
    name: "persons_create",
    description: "Create a new person/contact in the CRM.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Full name (required)" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        position: { type: "string", description: "Job title / role" },
        notes: { type: "string", description: "Notes" },
        company_id: { type: "number", description: "ID of company to link to" },
      },
      required: ["name"],
    },
  },
  {
    name: "persons_update",
    description: "Update an existing person. Only provided fields are changed.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Person ID (required)" },
        name: { type: "string", description: "Full name" },
        email: { type: "string", description: "Email address" },
        phone: { type: "string", description: "Phone number" },
        position: { type: "string", description: "Job title / role" },
        notes: { type: "string", description: "Notes" },
        company_id: { type: "number", description: "Company ID (use null to unlink)" },
      },
      required: ["id"],
    },
  },
  {
    name: "persons_delete",
    description: "Soft-delete a person (moves to trash, can be restored).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Person ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "persons_mark_contacted",
    description: "Mark a person as contacted right now (updates lastContactedAt).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Person ID" },
      },
      required: ["id"],
    },
  },
  // ─── WRITE: Companies ───
  {
    name: "companies_create",
    description: "Create a new company.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Company name (required)" },
        website: { type: "string", description: "Website URL (must start with http/https)" },
        industry: { type: "string", description: "Industry" },
        email: { type: "string", description: "Company email" },
        phone: { type: "string", description: "Phone number" },
        address: { type: "string", description: "Address" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["name"],
    },
  },
  {
    name: "companies_update",
    description: "Update an existing company. Only provided fields are changed.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Company ID (required)" },
        name: { type: "string", description: "Company name" },
        website: { type: "string", description: "Website URL" },
        industry: { type: "string", description: "Industry" },
        email: { type: "string", description: "Email" },
        phone: { type: "string", description: "Phone" },
        address: { type: "string", description: "Address" },
        notes: { type: "string", description: "Notes" },
      },
      required: ["id"],
    },
  },
  {
    name: "companies_delete",
    description: "Soft-delete a company (moves to trash, can be restored).",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Company ID" },
      },
      required: ["id"],
    },
  },
  // ─── WRITE: Events ───
  {
    name: "events_create",
    description: "Create a new event.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Event name (required)" },
        date: { type: "string", description: "Date in YYYY-MM-DD format (required)" },
        location: { type: "string", description: "Location" },
        description: { type: "string", description: "Description" },
        company_id: { type: "number", description: "Related company ID" },
      },
      required: ["name", "date"],
    },
  },
  {
    name: "events_update",
    description: "Update an existing event. Only provided fields are changed.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Event ID (required)" },
        name: { type: "string", description: "Event name" },
        date: { type: "string", description: "Date in YYYY-MM-DD format" },
        location: { type: "string", description: "Location" },
        description: { type: "string", description: "Description" },
        company_id: { type: "number", description: "Related company ID" },
        status: { type: "string", description: "Status: upcoming, attended, or cancelled" },
      },
      required: ["id"],
    },
  },
  {
    name: "events_delete",
    description: "Permanently delete an event.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Event ID" },
      },
      required: ["id"],
    },
  },
  // ─── WRITE: Todos ───
  {
    name: "todos_create",
    description: "Create a new to-do item.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Task title (required)" },
        due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
        notes: { type: "string", description: "Notes" },
        person_id: { type: "number", description: "Related person ID" },
        event_id: { type: "number", description: "Related event ID" },
      },
      required: ["title"],
    },
  },
  {
    name: "todos_update",
    description: "Update an existing to-do. Only provided fields are changed.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Todo ID (required)" },
        title: { type: "string", description: "Task title" },
        due_date: { type: "string", description: "Due date in YYYY-MM-DD format" },
        notes: { type: "string", description: "Notes" },
        person_id: { type: "number", description: "Related person ID" },
        event_id: { type: "number", description: "Related event ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "todos_toggle",
    description: "Toggle a to-do's completion status.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Todo ID" },
        done: { type: "boolean", description: "Set to true (done) or false (pending)" },
      },
      required: ["id", "done"],
    },
  },
  {
    name: "todos_delete",
    description: "Permanently delete a to-do item.",
    input_schema: {
      type: "object" as const,
      properties: {
        id: { type: "number", description: "Todo ID" },
      },
      required: ["id"],
    },
  },
  // ─── WRITE: Emails ───
  {
    name: "emails_send",
    description: "Send an email via Resend. Auto-links to a CRM person if the recipient email matches. Updates lastContactedAt.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient email address (required)" },
        subject: { type: "string", description: "Email subject (required)" },
        body: { type: "string", description: "Email body text (required)" },
        from: { type: "string", description: "Sender address (must be one of the available from-addresses)" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "emails_save_draft",
    description: "Save an email as a draft without sending.",
    input_schema: {
      type: "object" as const,
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject" },
        body: { type: "string", description: "Email body text" },
        from: { type: "string", description: "Sender address" },
      },
      required: [],
    },
  },
  // ─── WRITE: Activities ───
  {
    name: "activities_create",
    description: "Log an activity (call, meeting, note, email, other) on a person or company.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: { type: "string", enum: ["call", "meeting", "note", "email", "other"], description: "Activity type (required)" },
        title: { type: "string", description: "What happened (required)" },
        notes: { type: "string", description: "Additional notes" },
        person_id: { type: "number", description: "Person ID to log against" },
        company_id: { type: "number", description: "Company ID to log against" },
      },
      required: ["type", "title"],
    },
  },
  // ─── WRITE: Tags ───
  {
    name: "tags_create",
    description: "Create a new tag with a colour.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Tag name (required)" },
        colour: { type: "string", description: "Hex colour code (e.g. #3b82f6). Default: #6b7280" },
      },
      required: ["name"],
    },
  },
  {
    name: "tags_add_to_entity",
    description: "Add a tag to a person or company. Provide either person_id or company_id.",
    input_schema: {
      type: "object" as const,
      properties: {
        tag_id: { type: "number", description: "Tag ID (required)" },
        person_id: { type: "number", description: "Person ID" },
        company_id: { type: "number", description: "Company ID" },
      },
      required: ["tag_id"],
    },
  },
  {
    name: "tags_remove_from_entity",
    description: "Remove a tag assignment by its entity_tag ID.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_tag_id: { type: "number", description: "Entity-tag junction record ID" },
      },
      required: ["entity_tag_id"],
    },
  },
];
