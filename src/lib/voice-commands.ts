// Custom event for AI-triggered navigation (used by AI chat page for typed commands)
export const NAVIGATE_EVENT = "mini-crm:navigate";

export function dispatchNavigate(url: string) {
  window.dispatchEvent(
    new CustomEvent(NAVIGATE_EVENT, { detail: url })
  );
}
