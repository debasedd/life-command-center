import BottomNav from "@/components/bottom-nav";
import { getAuthUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getAuthUserId();
  if (!userId) redirect("/login");
  return (
    <div className="mx-auto max-w-md min-h-screen pb-nav">
      <main className="px-4 pt-3 safe-top">{children}</main>
      <BottomNav />
    </div>
  );
}