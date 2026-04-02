// Navigation route map - keys are normalised phrases, values are routes
const ROUTES: Record<string, string> = {
  // Main pages
  "dashboard": "/",
  "home": "/",
  "ai chat": "/ai",
  "chat": "/ai",
  "emails": "/emails",
  "email": "/emails",
  "inbox": "/emails",
  "persons": "/persons",
  "contacts": "/persons",
  "people": "/persons",
  "companies": "/companies",
  "events": "/events",
  "todos": "/todos",
  "to do": "/todos",
  "to dos": "/todos",
  "calendar": "/calendar",
  "trash": "/trash",
  "profile": "/profile",
  // Create routes
  "new person": "/persons/new",
  "add person": "/persons/new",
  "new contact": "/persons/new",
  "add contact": "/persons/new",
  "create person": "/persons/new",
  "create contact": "/persons/new",
  "new company": "/companies/new",
  "add company": "/companies/new",
  "create company": "/companies/new",
  "new event": "/events/new",
  "add event": "/events/new",
  "create event": "/events/new",
  "new todo": "/todos/new",
  "add todo": "/todos/new",
  "new to do": "/todos/new",
  "add to do": "/todos/new",
  "create todo": "/todos/new",
  "create to do": "/todos/new",
  "compose email": "/emails/compose",
  "new email": "/emails/compose",
  "draft email": "/emails/compose",
  "write email": "/emails/compose",
  "send email": "/emails/compose",
};

// Prefixes that people naturally say before the actual command
const PREFIXES = [
  "show me",
  "show",
  "go to",
  "goto",
  "open",
  "navigate to",
  "take me to",
  "switch to",
  "view",
];

export function matchNavigationCommand(transcript: string): string | null {
  let text = transcript.toLowerCase().trim();

  // Strip common prefixes
  for (const prefix of PREFIXES) {
    if (text.startsWith(prefix + " ")) {
      text = text.slice(prefix.length).trim();
      break;
    }
  }

  // Try exact match first (handles multi-word like "new company")
  if (ROUTES[text]) return ROUTES[text];

  // Try matching the start of the text (handles "persons list" matching "persons")
  // Sort by key length descending so "new person" matches before "person"
  const sorted = Object.entries(ROUTES).sort((a, b) => b[0].length - a[0].length);
  for (const [key, route] of sorted) {
    if (text.startsWith(key)) return route;
  }

  return null;
}

// Custom event for commands that should go to AI chat
export const AI_COMMAND_EVENT = "mini-crm:ai-command";

export function dispatchAICommand(text: string) {
  window.dispatchEvent(
    new CustomEvent(AI_COMMAND_EVENT, { detail: text })
  );
}
