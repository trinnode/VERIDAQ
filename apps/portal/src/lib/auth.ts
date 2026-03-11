// server-side auth helpers — only run in Server Components and layout files
// reads the JWT from the httpOnly cookie set at login

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "veridaq_portal_token";

// call this in any protected server component to get the current token
// if there's no valid session it redirects to /login
export async function requireAuth(): Promise<string> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    redirect("/login");
  }
  return token;
}

// same as above but returns null instead of redirecting
// useful for layouts that want to show different UI depending on auth state
export async function getToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

// name of the cookie so client code can read it too
export { SESSION_COOKIE };
