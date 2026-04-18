import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { GameSession } from "@/lib/types";

const COOKIE_NAME = "nba_guess_session";
const SECRET = process.env.GAME_SESSION_SECRET ?? "dev-secret-change-in-production";

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function encode(data: GameSession): string {
  const payload = Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

function decode(token: string): GameSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(json) as GameSession;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<GameSession | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return decode(token);
}

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

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}


