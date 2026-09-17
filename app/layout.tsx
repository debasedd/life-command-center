import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import SWRegister from "@/components/sw-register";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Life Command Center",
  description: "All-in-One Life OS — produktivitas, keuangan, kesehatan.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LifeCC",
  },
  icons: {
    icon: ["/icon.svg", "/icons/icon-192.png"],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f7f8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.variable} antialiased`}>
        <SWRegister />
        {children}
      </body>
    </html>
  );
}