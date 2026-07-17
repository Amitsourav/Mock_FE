/**
 * Pragmatic email check, not a full RFC 5322 validator: one "@", something on
 * each side, and a dotted domain. It catches typos ("me@gmail", trailing space)
 * without rejecting valid-but-unusual addresses. Returns null when valid, else a
 * message safe to show the user — mirrors validatePhone in lib/phone.
 */
export function validateEmail(raw: string): string | null {
  const email = raw.trim();
  if (!email) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "That doesn't look like a valid email address.";
  }
  return null;
}
