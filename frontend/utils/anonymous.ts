import { v4 as uuidv4 } from "uuid";

const ANON_ID_KEY = "meg:anon_id";

export function getOrCreateAnonymousId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.localStorage.getItem(ANON_ID_KEY);
    if (existing) return existing;
    const id = `anon_${uuidv4()}`;
    window.localStorage.setItem(ANON_ID_KEY, id);
    return id;
  } catch {
    // Fallback: still return a stable-ish value for this tab
    return `anon_${uuidv4()}`;
  }
}


