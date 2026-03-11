import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/api";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE);
  if (token?.value) {
    redirect("/dashboard");
  }
  redirect("/login");
}
