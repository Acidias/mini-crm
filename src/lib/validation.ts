const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_REGEX = /^https?:\/\/.+/;

export function validateEmail(email: string | null): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;
  if (!EMAIL_REGEX.test(trimmed)) throw new Error("Invalid email format");
  return trimmed.toLowerCase();
}

export function validateUrl(url: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (!URL_REGEX.test(trimmed)) throw new Error("Website must start with http:// or https://");
  return trimmed;
}

export function validateRequired(value: string | null, fieldName: string): string {
  if (!value || !value.trim()) throw new Error(`${fieldName} is required`);
  return value.trim();
}

export function cleanString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed || null;
}
