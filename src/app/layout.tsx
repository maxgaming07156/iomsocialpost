import type { Metadata } from "next";
import "./globals.css";
import { StudioProvider } from "@/context/StudioContext";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "InsideTheIOM Studio — Editorial & Social Automation Dashboard",
  description:
    "InsideTheIOM Studio (Phase 1 Demonstration). The Isle of Man All In One Place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <StudioProvider>
          <AppShell>{children}</AppShell>
        </StudioProvider>
      </body>
    </html>
  );
}
