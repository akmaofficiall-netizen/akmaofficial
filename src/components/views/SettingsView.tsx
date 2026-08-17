"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { Settings, Save, RefreshCw, Key, ShieldCheck } from "lucide-react";

export const SettingsView: React.FC = () => {
  const [form, setForm] = useState({
    businessName: "سازمان و کسب‌وکار حکمت آکما",
    taxNumber: "",
    currency: "تومان",
    healthGreenThreshold: 75,
    healthYellowThreshold: 50,
    openaiApiKey: "",
    aiEnabled: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings").then((r) => r.json());
      if (res.success && res.settings) {
        setForm({
          businessName: res.settings.businessName || "سازمان و کسب‌وکار حکمت آکما",
          taxNumber: res.settings.taxNumber || "",
          currency: res.settings.currency || "تومان",
          healthGreenThreshold: res.settings.healthGreenThreshold || 75,
          healthYellowThreshold: res.settings.healthYellowThreshold || 50,
          openaiApiKey: res.settings.openaiApiKey || "",
          aiEnabled: res.settings.aiEnabled !== undefined ? res.settings.aiEnabled : true,
        });
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json());

      if (res.success) {
        alert("تنظیمات با موفقیت ذخیره گردید.");
      } else {
        alert(res.error || "خطا در ذخیره تنظیمات");
      }
    } catch (err: any) {
      alert(err.message || "خطا در سیستم");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-slate-300" />
            تنظیمات کسب‌وکار و هوش مصنوعی
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            مشخصات حقوقی سازمان، آستانه‌های سلامت مشتریان CRM و پیکربندی کلید Gemini
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-6 text-xs">
        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">اطلاعات کسب‌وکار و مالی</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">نام سازمان / کسب‌وکار</label>
              <input
                type="text"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">کد اقتصادی / شماره مالیاتی</label>
              <input
                type="text"
                value={form.taxNumber}
                onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t border-slate-800 pt-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2 flex items-center gap-2">
            <Key className="h-4 w-4 text-purple-400" />
            پیکربندی هوش مصنوعی (Google Gemini)
          </h3>

          <div>
            <label className="block text-slate-400 mb-1">Gemini API Key (ذخیره امن سمت سرور)</label>
            <input
              type="password"
              placeholder="AIza..."
              value={form.openaiApiKey}
              onChange={(e) => setForm({ ...form, openaiApiKey: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
            />
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              مدل به‌صورت خودکار از مدل‌های مجاز همین API Key شناسایی و انتخاب می‌شود؛ نیازی به انتخاب دستی مدل نیست.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
          >
            <Save className="h-4 w-4" />
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات تنظیمات"}
          </button>
        </div>
      </form>
    </div>
  );
};
