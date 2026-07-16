import type { AuthError } from "@supabase/supabase-js";

/**
 * The user-facing copy is deliberately vague; the real cause is not. Surface it
 * in development so a delivery failure is one glance at the console rather than
 * a dig through Supabase's auth logs.
 *
 * Safe to print: this is the provider's error text. Tokens and OTP codes never
 * reach here — verifyOtp's code stays in component state and is never passed in.
 */
export function logAuthError(error: AuthError | null, context: "send" | "verify") {
  if (!error || process.env.NODE_ENV === "production") return;
  console.error(`[auth:${context}]`, error.code ?? error.status ?? "unknown", error.message);
}

/**
 * Supabase/Twilio errors are developer-facing ("For security purposes, you can
 * only request this after 47 seconds"). Map the ones a user can actually hit to
 * plain sentences. Anything unrecognised falls back to a generic line rather
 * than leaking a raw error object into the UI.
 */
export function humanizeAuthError(error: AuthError | null, context: "send" | "verify"): string {
  if (!error) return "Something went wrong. Please try again.";

  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  if (code === "over_sms_send_rate_limit" || code === "over_request_rate_limit") {
    return "Too many attempts. Try again in a minute.";
  }

  /* The SMS provider rejected the send (Twilio trial restrictions, carrier
     blocks, geo permissions, no credit). The number is usually fine, so we must
     NOT tell them to check it — that sends people off correcting a correct
     number. This is ours to fix, so say so and don't imply a user error. */
  if (code === "sms_send_failed" || message.includes("error sending confirmation otp")) {
    return "We couldn't send the code right now — that's on our side, not your number. Please try again shortly.";
  }

  // "For security purposes, you can only request this after N seconds."
  if (message.includes("for security purposes") || message.includes("rate limit")) {
    return "Too many attempts. Try again in a minute.";
  }

  // Supabase conflates a wrong code and a lapsed one into a single message
  // ("Token has expired or is invalid"), so we cannot honestly tell the user
  // which it was. Name both and give them the action for each.
  const expired = code === "otp_expired" || message.includes("expired");
  const invalid = code === "invalid_otp" || message.includes("invalid");

  if (expired && invalid) {
    return "That code is wrong or has expired. Check the SMS, or tap Resend for a new code.";
  }

  if (expired) {
    return "That code has expired. Tap Resend to get a new one.";
  }

  if (invalid || message.includes("token")) {
    return context === "verify"
      ? "That code isn't right. Check the SMS and try again."
      : "That number doesn't look right. Check it and try again.";
  }

  if (message.includes("invalid phone") || message.includes("phone")) {
    return "We couldn't send a code to that number. Check it and try again.";
  }

  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Couldn't reach the server. Check your connection and try again.";
  }

  return context === "send"
    ? "We couldn't send the code. Please try again."
    : "We couldn't verify that code. Please try again.";
}
