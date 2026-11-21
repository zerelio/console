import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/app/components/Sidebar";

export const metadata: Metadata = {
  title: "Zerelio Console",
  description: "Infrastructure Discovery Platform — Management Console",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex" style={{ background: "#0a0a0a" }}>
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
