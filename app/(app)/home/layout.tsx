import { ToastHost } from "@/components/ui";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToastHost />
    </>
  );
}