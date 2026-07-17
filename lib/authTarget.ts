import { formatE164ForDisplay } from "./phone";

/**
 * Who the OTP is being sent to. The discriminant decides which supabase-js shape
 * to use — `signInWithOtp`/`verifyOtp` take `{ phone, type: "sms" }` for one and
 * `{ email, type: "email" }` for the other — so the code screen keeps this whole
 * object rather than a bare string it would have to guess the channel from.
 */
export type AuthTarget =
  | { channel: "phone"; phone: string } // E.164, e.g. "+919876543210"
  | { channel: "email"; email: string };

/** Human-readable form for the "we sent a code to …" line on the code screen. */
export function describeTarget(target: AuthTarget): string {
  return target.channel === "phone" ? formatE164ForDisplay(target.phone) : target.email;
}
