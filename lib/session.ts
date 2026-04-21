import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { GameSession } from "@/lib/types";

const COOKIE_NAME = "nba_guess_session";
const SECRET = process.env.GAME_SESSION_SECRET ?? "dev-secret-change-in-production";

/** Create an HMAC signature for encoded payload. */
function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

/** Serialize and sign session object into cookie-safe token. */
function encode(data: GameSession): string {
  const payload = Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

/** Verify token signature, then deserialize session payload. */
function decode(token: string): GameSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  // Use timing-safe comparison to reduce signature probing risk.
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(json) as GameSession;
  } catch {
    return null;
  }
}

/** Read and verify current game session from cookie. */
export async function readSession(): Promise<GameSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decode(token);
}

/** Persist game session into secure HttpOnly cookie. */
export async function writeSession(session: GameSession): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encode(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6,
  });
}

/** Remove game session cookie. */
export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
