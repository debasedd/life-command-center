import BottomNav from "@/components/bottom-nav";
import BootGate from "@/components/boot-gate";
import { ToastHost } from "@/components/ui";

// Static shell: zero DB hit on navigation. Data flows in via client fetch,
// gated by BootGate on session start so every tab opens with warm data.
export const dynamic = "force-static";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md min-h-screen pb-nav">
      <BootGate>
        <main className="px-4 pt-3 safe-top">{children}</main>
        <BottomNav />
        {/* Mounted app-wide: toast() is called from every tab, not just /home. */}
        <ToastHost />
      </BootGate>
    </div>
  );
}
