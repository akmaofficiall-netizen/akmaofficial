"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import {
  TrendingUp,
  BarChart2,
  DollarSign,
  Sliders,
  Layers,
  RefreshCw,
  ArrowUpRight,
  ShoppingBag,
  Users,
  Calendar,
  Package
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { toJalaliDate, formatMoney, formatNumber } from "@/lib/dateUtils";

export const ReportsView: React.FC<{ selectedProjectId: string | null }> = ({ selectedProjectId }) => {
  const [activeTab, setActiveTab] = useState<"financial" | "sales" | "inflation" | "comparison">("financial");
  const [financialData, setFinancialData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Inflation simulator state
  const [simulatedChanges, setSimulatedChanges] = useState<{ [key: string]: number }>({});
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [simResults, setSimResults] = useState<any[]>([]);

  // Comparison State
  const [projA, setProjA] = useState("");
  const [projB, setProjB] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const projParam = selectedProjectId ? `&projectId=${selectedProjectId}` : "";
      const [finRes, salesRes, projRes, rmRes] = await Promise.all([
        fetch(`/api/reports?type=financial${projParam}`).then((r) => r.json()),
        fetch(`/api/reports?type=sales${projParam}`).then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/raw-materials").then((r) => r.json()),
      ]);

      if (finRes.success) setFinancialData(finRes.data);
      if (salesRes.success) setSalesData(salesRes.data);
      if (projRes.success) {
        setProjects(projRes.projects || []);
        if (projRes.projects.length >= 2) {
          setProjA(projRes.projects[0].id);
          setProjB(projRes.projects[1].id);
        }
      }
      if (rmRes.success) setRawMaterials(rmRes.rawMaterials || []);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  const handleRunInflationSim = async () => {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate_inflation", changes: simulatedChanges }),
      }).then((r) => r.json());

      if (res.success) {
        setSimResults(res.simulation || []);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

  const handleRunComparison = async () => {
    if (!projA || !projB) return;
    try {
      const res = await fetch(`/api/reports?type=project_comparison&projectAId=${projA}&projectBId=${projB}`).then((r) =>
        r.json()
      );
      if (res.success) {
        setComparisonData(res.data);
      }
    } catch (err) {
      console.error("Comparison error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const kpis = financialData?.kpis || {};
  const waterfallData = financialData?.waterfallData || [];

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-purple-400" />
            مرکز گزارشات مدیریتی، سود و زیان (P&L) و تحلیل داده‌ها
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            داده‌های عملیاتی یکپارچه از فروش ویزیتوری، انبارداری و هزینه‌های جاری
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl bg-slate-900 p-1.5 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("financial")}
            className={`rounded-xl px-4 py-2 transition ${
              activeTab === "financial" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            سود و زیان (P&L)
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`rounded-xl px-4 py-2 transition ${
              activeTab === "sales" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            فروش و همکاران
          </button>
          <button
            onClick={() => setActiveTab("inflation")}
            className={`rounded-xl px-4 py-2 transition ${
              activeTab === "inflation" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            شبیه‌ساز تورم
          </button>
          <button
            onClick={() => setActiveTab("comparison")}
            className={`rounded-xl px-4 py-2 transition ${
              activeTab === "comparison" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            مقایسه پروژه‌ها
          </button>
        </div>
      </div>

      {/* Tab 1: Financial P&L Waterfall */}
      {activeTab === "financial" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">درآمد ناخالص فروش:</span>
              <h3 className="text-2xl font-bold text-blue-400 font-mono">
                {formatMoney(kpis.netRevenue || 0)}
              </h3>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">سود ناخالص (Gross Profit):</span>
              <h3 className={`text-2xl font-bold font-mono ${kpis.grossProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatMoney(kpis.grossProfit || 0)}
              </h3>
              <p className="text-xs text-slate-400">حاشیه سود ناخالص: {kpis.grossMarginPercent || 0}%</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">سود خالص عملیاتی (Net Profit):</span>
              <h3 className={`text-2xl font-bold font-mono ${kpis.netProfit >= 0 ? "text-purple-300" : "text-rose-400"}`}>
                {formatMoney(kpis.netProfit || 0)}
              </h3>
              <p className="text-xs text-slate-400">حاشیه سود خالص: {kpis.netMarginPercent || 0}%</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">نمودار ساختار سود و زیان (Waterfall Bridge)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="step" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }}
                  />
                  <Bar dataKey="value" name="مبلغ (تومان)" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sales & Employees */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
              <span className="text-xs text-slate-400">کل فاکتورهای فروش ثبت‌شده:</span>
              <h3 className="text-2xl font-bold text-cyan-400 font-mono">
                {salesData?.invoiceCount || 0} عدد
              </h3>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
              <span className="text-xs text-slate-400">مجموع فروش ویزیتوری:</span>
              <h3 className="text-2xl font-bold text-emerald-400 font-mono">
                {formatMoney(salesData?.visitorSalesTotal || 0)}
              </h3>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
              <span className="text-xs text-slate-400">پورسانت‌های تعلق‌گرفته:</span>
              <h3 className="text-2xl font-bold text-purple-300 font-mono">
                {formatMoney(salesData?.commissionTotal || 0)}
              </h3>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              عملکرد فروش و پورسانت همکاران و ویزیتورها
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">نام همکار</th>
                    <th className="p-3.5">سمت</th>
                    <th className="p-3.5">تعداد فاکتورها</th>
                    <th className="p-3.5">مجموع فروش (تومان)</th>
                    <th className="p-3.5">پورسانت کل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(salesData?.employeePerformances || []).map((emp: any) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-white">{emp.employeeName}</td>
                      <td className="p-3.5 text-slate-400">{emp.role || "ویزیتور"}</td>
                      <td className="p-3.5 font-mono">{emp.invoiceCount || 0}</td>
                      <td className="p-3.5 font-bold text-emerald-400 font-mono">{formatMoney(emp.totalSales)}</td>
                      <td className="p-3.5 font-bold text-purple-300 font-mono">{formatMoney(emp.totalCommission)}</td>
                    </tr>
                  ))}
                  {!(salesData?.employeePerformances || []).length && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        داده‌ای از فروش همکاران ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Inflation Simulator */}
      {activeTab === "inflation" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-400" />
              سناریوسازی تغییر قیمت مواد اولیه و تورم داخلی (What-If Analysis)
            </h3>
            <p className="text-xs text-slate-400">
              بدون تغییر داده‌های واقعی دیتابیس، درصد گرانی مواد اولیه را وارد کرده و اثر آن را بر بهای تمام شده، حاشیه سود و قیمت فروش پیشنهادی بررسی نمایید.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {rawMaterials.map((rm) => (
                <div key={rm.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{rm.name}</span>
                    <span className="text-slate-400">{formatMoney(rm.currentCost)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">درصد افزایش:</span>
                    <input
                      type="number"
                      placeholder="0%"
                      value={simulatedChanges[rm.id] || ""}
                      onChange={(e) =>
                        setSimulatedChanges({ ...simulatedChanges, [rm.id]: Number(e.target.value) })
                      }
                      className="w-20 rounded-xl border border-slate-800 bg-slate-900 p-1.5 text-center font-bold text-amber-400"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleRunInflationSim}
              className="rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 transition"
            >
              محاسبه اثر تورم بر بهای تمام شده و پیشنهاد قیمت
            </button>
          </div>

          {/* Results */}
          {simResults.length > 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden p-6 space-y-4">
              <h4 className="text-sm font-bold text-white">نتایج شبیه‌سازی قیمت محصولات</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">نام محصول</th>
                      <th className="p-3.5">قیمت فروش فعلی</th>
                      <th className="p-3.5">بهای تمام‌شده فعلی</th>
                      <th className="p-3.5">بهای تمام‌شده جدید</th>
                      <th className="p-3.5">افت حاشیه سود</th>
                      <th className="p-3.5">قیمت فروش پیشنهادی جدید</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {simResults.map((r) => (
                      <tr key={r.productId} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-white">{r.productName}</td>
                        <td className="p-3.5 text-slate-300 font-mono">{formatMoney(r.currentPrice)}</td>
                        <td className="p-3.5 text-slate-400 font-mono">{formatMoney(r.oldCogs)}</td>
                        <td className="p-3.5 font-bold text-amber-400 font-mono">{formatMoney(r.newCogs)}</td>
                        <td className="p-3.5 font-bold text-rose-400 font-mono">-{r.marginCompressionPct}%</td>
                        <td className="p-3.5 font-bold text-emerald-400 font-mono">{formatMoney(r.recommendedPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Project Comparison */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              مقایسه شاخص‌های کلیدی پروژه A با پروژه B
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">انتخاب پروژه اول (A):</label>
                <select
                  value={projA}
                  onChange={(e) => setProjA(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">انتخاب پروژه دوم (B):</label>
                <select
                  value={projB}
                  onChange={(e) => setProjB(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleRunComparison}
              className="rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
            >
              اجرای جدول مقایسه پروژه‌ها
            </button>
          </div>

          {comparisonData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Proj A */}
              <div className="rounded-3xl border border-blue-500/30 bg-slate-900/60 p-6 shadow-xl space-y-3">
                <NeonBadge variant="blue">{comparisonData.projectA?.info?.name || "پروژه A"}</NeonBadge>
                <p className="text-slate-300">
                  فروش کل: <b className="text-white font-mono">{formatMoney(comparisonData.projectA?.kpis?.totalSales || 0)}</b>
                </p>
                <p className="text-emerald-400 font-bold">
                  سود ناخالص: <span className="font-mono">{formatMoney(comparisonData.projectA?.kpis?.totalGrossProfit || 0)}</span>
                </p>
                <p className="text-slate-400">
                  تعداد فاکتورها: <b className="text-slate-200 font-mono">{comparisonData.projectA?.kpis?.invoiceCount || 0}</b>
                </p>
              </div>

              {/* Proj B */}
              <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/60 p-6 shadow-xl space-y-3">
                <NeonBadge variant="green">{comparisonData.projectB?.info?.name || "پروژه B"}</NeonBadge>
                <p className="text-slate-300">
                  فروش کل: <b className="text-white font-mono">{formatMoney(comparisonData.projectB?.kpis?.totalSales || 0)}</b>
                </p>
                <p className="text-emerald-400 font-bold">
                  سود ناخالص: <span className="font-mono">{formatMoney(comparisonData.projectB?.kpis?.totalGrossProfit || 0)}</span>
                </p>
                <p className="text-slate-400">
                  تعداد فاکتورها: <b className="text-slate-200 font-mono">{comparisonData.projectB?.kpis?.invoiceCount || 0}</b>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
