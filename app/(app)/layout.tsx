import BottomNav from "@/components/bottom-nav";

// Static shell: zero DB hit on navigation. Data flows in via client fetch.
export const dynamic = "force-static";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md min-h-screen pb-nav">
      <main className="px-4 pt-3 safe-top">{children}</main>
      <BottomNav />
    </div>
  );
}
