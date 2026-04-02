// Custom event for voice commands that should go to AI chat
export const AI_COMMAND_EVENT = "mini-crm:ai-command";

export function dispatchAICommand(text: string) {
  window.dispatchEvent(
    new CustomEvent(AI_COMMAND_EVENT, { detail: text })
  );
}

// Custom event for AI-triggered navigation
export const NAVIGATE_EVENT = "mini-crm:navigate";

export function dispatchNavigate(url: string) {
  window.dispatchEvent(
    new CustomEvent(NAVIGATE_EVENT, { detail: url })
  );
}
