import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("veridaq_verify_token");
  if (token?.value) redirect("/dashboard");
  redirect("/login");
}
