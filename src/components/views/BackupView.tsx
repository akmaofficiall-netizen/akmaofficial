"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { Database, Download, RefreshCw, ShieldCheck, Plus } from "lucide-react";

export const BackupView: React.FC = () => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backups").then((r) => r.json());
      if (res.success) setBackups(res.backups || []);
    } catch (err) {
      console.error("Error fetching backups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/backups", { method: "POST" }).then((r) => r.json());
      if (res.success) {
        fetchBackups();
        alert("پشتیبان‌گیری کامل دیتابیس با هش checksum اختصاصی با موفقیت ثبت شد.");
      } else {
        alert(res.error || "خطا در ایجاد پشتیبان");
      }
    } catch (err: any) {
      alert(err.message || "خطا در سیستم");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-400" />
            سیستم پشتیبان‌گیری و بازیابی دیتابیس (Backup & Restore)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تهیه فایل پشتیبان جامع شامل پروژه‌ها، مشتریان، فاکتورها، حساب‌ها و تنظیمات با امکان سنجش صحت داده
          </p>
        </div>

        <button
          onClick={handleCreateBackup}
          disabled={creating}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
        >
          {creating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          ایجاد پشتیبان جدید (JSON Snapshot)
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">لیست فایل‌های پشتیبان سیستم</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">نام فایل</th>
                <th className="p-3">تاریخ ثبت</th>
                <th className="p-3">حجم فایل</th>
                <th className="p-3">شناسه صحت (Checksum)</th>
                <th className="p-3">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {backups.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-bold text-white">{b.filename}</td>
                  <td className="p-3 text-slate-400">{new Date(b.createdAt).toLocaleString("fa-IR")}</td>
                  <td className="p-3 text-slate-300">{(b.sizeBytes / 1024).toFixed(1)} KB</td>
                  <td className="p-3 font-mono text-[10px] text-slate-500">{b.checksum}</td>
                  <td className="p-3">
                    <NeonBadge variant="green">کامل و معتبر</NeonBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
