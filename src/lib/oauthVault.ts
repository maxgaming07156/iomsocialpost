import crypto from "crypto";
import { cookies } from "next/headers";

export const IG_COOKIE_NAME = "iom_ig_oauth_v1";
export const TT_COOKIE_NAME = "iom_tt_oauth_v1";
export const OAUTH_STATE_COOKIE = "iom_oauth_state_v1";

export interface StoredOAuthSession {
  platform: "instagram" | "tiktok";
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix ms
  accountId: string;
  accountName: string;
  accountType: string;
  grantedScopes: string[];
  lastCheckedAt: string;
}

export interface StoredOAuthState {
  platform: "instagram" | "tiktok";
  state: string;
  codeVerifier?: string;
  createdAt: number;
}

function getEncryptionKey(): Buffer | null {
  const raw = process.env.STUDIO_TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw || raw.length < 16) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

export function isTokenEncryptionConfigured(): boolean {
  return getEncryptionKey() !== null;
}

export function encryptJsonPayload(payload: unknown): string {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("STUDIO_TOKEN_ENCRYPTION_KEY is not configured.");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptJsonPayload<T>(token: string): T | null {
  const key = getEncryptionKey();
  if (!key || !token) return null;
  try {
    const raw = Buffer.from(token, "base64url");
    if (raw.length < 28) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString("utf8")) as T;
  } catch {
    return null;
  }
}

export async function readOAuthSession(
  platform: "instagram" | "tiktok"
): Promise<StoredOAuthSession | null> {
  const store = await cookies();
  const name = platform === "instagram" ? IG_COOKIE_NAME : TT_COOKIE_NAME;
  const raw = store.get(name)?.value;
  if (!raw) return null;
  return decryptJsonPayload<StoredOAuthSession>(raw);
}

export function buildSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function generateCsrfState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function generatePkcePair(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}
