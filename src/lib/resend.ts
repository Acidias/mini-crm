import { Resend } from "resend";

// Lazy-initialised client - avoids crashing during build when env var is absent
let _resend: Resend | null = null;
export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Available "from" addresses - any address on a verified Resend domain works
export const FROM_ADDRESSES = [
  "info@foundry70.co.uk",
  "hello@foundry70.co.uk",
  "sales@foundry70.co.uk",
  "support@foundry70.co.uk",
];

export const DEFAULT_FROM = FROM_ADDRESSES[0];
