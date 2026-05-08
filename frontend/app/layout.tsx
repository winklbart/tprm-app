import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "TPRM Hub",
  description: "Third-Party Risk Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen bg-bg-primary text-text-primary">
        <Sidebar />
        <main className="flex-1" style={{ padding: "20px 24px" }}>{children}</main>
      </body>
    </html>
  );
}
