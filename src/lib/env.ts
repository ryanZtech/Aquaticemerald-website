/**
 * Strip accidental surrounding quotes from an env var value.
 * A common footgun: pasting `JWT_SECRET="abc123"` (with quotes) into
 * .env.local or a hosting provider's dashboard, which some tools then treat
 * as a literal part of the value. Must be applied consistently everywhere a
 * secret is read — if login signs with a sanitized secret but verification
 * reads the raw value, tokens will always fail to verify.
 */
export function sanitizeEnv(val: string | undefined): string | undefined {
  if (!val) return undefined;
  return val.replace(/^['"]|['"]$/g, "");
}
