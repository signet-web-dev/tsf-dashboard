// Amazon SP-API order notifications don't carry a per-request HMAC the way
// Shopify does, so this endpoint expects callers (e.g. an SQS-to-HTTP bridge)
// to forward the configured shared secret in this header.
export async function verifyAmazonSecret(secretHeader: string | null, secret: string): Promise<boolean> {
  return !!secretHeader && secretHeader === secret;
}
