import type { Metadata, Viewport } from "next";
import SWRegister from "@/components/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Command Center",
  description: "All-in-One Life OS — produktivitas, keuangan, kesehatan.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LifeCC",
  },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="antialiased">
        <SWRegister />
        {children}
      </body>
    </html>
  );
}