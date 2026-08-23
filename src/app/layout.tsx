import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "سیستم مدیریت و حسابداری حکمت آکما",
  description: "سامانه یکپارچه ERP، مدیریت تولید، انبار، زنجیره تامین، فاکتورها و تحلیل‌های مالی حکمت آکما",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
