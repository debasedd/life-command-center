import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";

export default async function Root() {
  const userId = await getAuthUserId();
  redirect(userId ? "/home" : "/login");
}