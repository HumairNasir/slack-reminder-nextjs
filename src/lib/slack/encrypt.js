// Simple encryption for Slack tokens (in production use stronger encryption)
export function encryptToken(token) {
  // For development, we'll store as-is
  // In production, you should use proper encryption
  return Buffer.from(token).toString("base64");
}

export function decryptToken(encryptedToken) {
  return Buffer.from(encryptedToken, "base64").toString("utf-8");
}
