"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { MapPin, Phone, Users, Activity, Filter, RefreshCw } from "lucide-react";

export const CustomerMapView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHealth, setSelectedHealth] = useState<string>("all");
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers").then((r) => r.json());
      if (res.success) setCustomers(res.customers || []);
    } catch (err) {
      console.error("Failed to load map customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = customers.filter((c) => {
    if (selectedHealth !== "all" && c.healthStatus !== selectedHealth) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapPin className="h-6 w-6 text-rose-400" />
            نقشه جغرافیایی مشتریان و پراکندگی سلامت
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            نمایش موقعیت مشتریان روی نقشه ایران، تفکیک رنگ بر اساس امتیاز سلامت CRM و پایش منطقه‌ای
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedHealth}
            onChange={(e) => setSelectedHealth(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white"
          >
            <option value="all">تمام وضعیت‌های سلامت</option>
            <option value="green">فقط سلامت سبز (سالم)</option>
            <option value="yellow">فقط هشدار زرد</option>
            <option value="red">فقط بحرانی قرمز</option>
          </select>

          <button
            onClick={fetchData}
            className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Map Interactive Canvas */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl min-h-[480px] overflow-hidden flex flex-col justify-between">
        {/* Decorative Grid Lines to simulate map coordinate system */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <div className="relative z-10 flex justify-between items-start">
          <div className="rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-800 p-3 text-xs space-y-1">
            <p className="font-bold text-white">راهنمای نشانگرهای نقشه:</p>
            <div className="flex items-center gap-4 text-[11px] pt-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" /> سبز: خرید
                منظم
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" /> زرد: سررسید
                نزدیک
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" /> قرمز: معوق /
                ریزش
              </span>
            </div>
          </div>

          <NeonBadge variant="blue">تعداد روی نقشه: {filtered.length} مشتری</NeonBadge>
        </div>

        {/* Map Pins Simulation Plotting Tehran / Iran Cities Coordinates */}
        <div className="relative z-10 my-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveCustomer(c)}
              className={`cursor-pointer rounded-2xl border p-4 backdrop-blur-md transition-all duration-200 hover:scale-102 ${
                activeCustomer?.id === c.id
                  ? "border-blue-500 bg-slate-900/90 shadow-xl shadow-blue-500/10"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin
                    className={`h-5 w-5 ${
                      c.healthStatus === "green"
                        ? "text-emerald-400"
                        : c.healthStatus === "yellow"
                        ? "text-amber-400"
                        : "text-rose-400"
                    }`}
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm">{c.name}</h4>
                    <p className="text-[11px] text-slate-400">{c.storeName || c.city}</p>
                  </div>
                </div>

                <NeonBadge variant={c.healthStatus} size="sm">
                  {c.healthScore}
                </NeonBadge>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>موقعیت: {c.latitude}, {c.longitude}</span>
                <span className="font-mono text-purple-400">{c.mobile}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Customer Detail Drawer */}
        {activeCustomer && (
          <div className="relative z-20 rounded-xl border border-blue-500/30 bg-slate-900/90 p-4 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <div>
                <h4 className="font-bold text-white text-sm">{activeCustomer.name} ({activeCustomer.storeName || "مشتری حقیقی"})</h4>
                <p className="text-xs text-slate-400">{activeCustomer.address || activeCustomer.city}</p>
              </div>
            </div>

            <NeonBadge variant={activeCustomer.healthStatus}>
              امتیاز سلامت {activeCustomer.healthScore}
            </NeonBadge>
          </div>
        )}
      </div>
    </div>
  );
};
