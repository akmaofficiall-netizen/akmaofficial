import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "سیستم مدیریت حکمت آکما",
  description: "سیستم یکپارچه مدیریت عملیات، حسابداری و CRM حکمت آکما",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
