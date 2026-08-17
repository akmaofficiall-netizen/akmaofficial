"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { TrendingUp, BarChart2, DollarSign, Sliders, Layers, RefreshCw, ArrowUpRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

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
            مرکز گزارشات مدیریتی، سود و زیان (P&L) و تحلیل تورم
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            منبع اطلاعات مستقیماً داده‌های عملیاتی در یکپارچگی کامل با انبار، فروش و هزینه‌ها
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("financial")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "financial" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            سود و زیان (P&L)
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "sales" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            فروش و فاکتورها
          </button>
          <button
            onClick={() => setActiveTab("inflation")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "inflation" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            شبیه‌ساز تورم داخلی
          </button>
          <button
            onClick={() => setActiveTab("comparison")}
            className={`rounded-lg px-3 py-1.5 transition-all ${
              activeTab === "comparison" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
              <span className="text-xs text-slate-400">درآمد خالص فروش:</span>
              <h3 className="text-2xl font-bold text-blue-400 mt-1">
                {(kpis.netRevenue || 0).toLocaleString("fa-IR")} <span className="text-xs font-normal text-slate-400">تومان</span>
              </h3>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
              <span className="text-xs text-slate-400">سود ناخالص (Gross Profit):</span>
              <h3 className={`text-2xl font-bold mt-1 ${kpis.grossProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {(kpis.grossProfit || 0).toLocaleString("fa-IR")} <span className="text-xs font-normal text-slate-400">تومان</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">حاشیه سود ناخالص: {kpis.grossMarginPercent}%</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
              <span className="text-xs text-slate-400">سود خالص عملیاتی (Net Profit):</span>
              <h3 className={`text-2xl font-bold mt-1 ${kpis.netProfit >= 0 ? "text-purple-300" : "text-rose-400"}`}>
                {(kpis.netProfit || 0).toLocaleString("fa-IR")} <span className="text-xs font-normal text-slate-400">تومان</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">حاشیه سود خالص: {kpis.netMarginPercent}%</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">نمودار پل سود و زیان (Waterfall P&L Bridge)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="step" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }}
                  />
                  <Bar dataKey="value" name="مبلغ (تومان)" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Inflation Simulator */}
      {activeTab === "inflation" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-400" />
              سناریوسازی تغییر قیمت مواد اولیه و تورم داخلی (What-If Analysis)
            </h3>
            <p className="text-xs text-slate-400">
              بدون تغییر داده‌های واقعی دیتابیس، درصد گرانی مواد اولیه را وارد کرده و اثر آن را بر بهای تمام شده، حاشیه سود و قیمت فروش پیشنهادی بررسی نمایید.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {rawMaterials.map((rm) => (
                <div key={rm.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{rm.name}</span>
                    <span className="text-slate-400">{rm.currentCost.toLocaleString("fa-IR")} تومان</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">درصد تغییر:</span>
                    <input
                      type="number"
                      placeholder="0%"
                      value={simulatedChanges[rm.id] || ""}
                      onChange={(e) =>
                        setSimulatedChanges({ ...simulatedChanges, [rm.id]: Number(e.target.value) })
                      }
                      className="w-20 rounded-lg border border-slate-800 bg-slate-900 p-1 text-center font-bold text-amber-400"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleRunInflationSim}
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500"
            >
              محاسبه اثر تورم بر بهای تمام شده و پیشنهاد قیمت
            </button>
          </div>

          {/* Results */}
          {simResults.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden p-5 space-y-3">
              <h4 className="text-sm font-bold text-white">نتایج شبیه‌سازی قیمت محصولات</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">محصول</th>
                      <th className="p-3">قیمت فعلی</th>
                      <th className="p-3">COGS فعلی</th>
                      <th className="p-3">COGS شبیه‌سازی شده</th>
                      <th className="p-3">کاهش حاشیه سود</th>
                      <th className="p-3">قیمت فروش پیشنهادی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {simResults.map((r) => (
                      <tr key={r.productId} className="hover:bg-slate-800/40">
                        <td className="p-3 font-bold text-white">{r.productName}</td>
                        <td className="p-3 text-slate-300">{r.currentPrice.toLocaleString("fa-IR")} تومان</td>
                        <td className="p-3 text-slate-400">{r.oldCogs.toLocaleString("fa-IR")} تومان</td>
                        <td className="p-3 font-bold text-amber-400">{r.newCogs.toLocaleString("fa-IR")} تومان</td>
                        <td className="p-3 font-bold text-rose-400">-{r.marginCompressionPct}%</td>
                        <td className="p-3 font-bold text-emerald-400">{r.recommendedPrice.toLocaleString("fa-IR")} تومان</td>
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              مقایسه شاخص‌های کلیدی پروژه A با پروژه B
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">انتخاب پروژه اول (A)</label>
                <select
                  value={projA}
                  onChange={(e) => setProjA(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">انتخاب پروژه دوم (B)</label>
                <select
                  value={projB}
                  onChange={(e) => setProjB(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
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
              className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500"
            >
              اجرای جدول مقایسه پروژه‌ها
            </button>
          </div>

          {comparisonData && (
            <div className="grid grid-cols-2 gap-6 text-xs">
              {/* Proj A */}
              <div className="rounded-2xl border border-blue-500/30 bg-slate-900/60 p-5 shadow-xl space-y-3">
                <NeonBadge variant="blue">{comparisonData.projectA.info?.name}</NeonBadge>
                <p className="text-slate-300">فروش کل: {comparisonData.projectA.kpis.totalSales.toLocaleString("fa-IR")} تومان</p>
                <p className="text-emerald-400 font-bold">سود ناخالص: {comparisonData.projectA.kpis.totalGrossProfit.toLocaleString("fa-IR")} تومان</p>
                <p className="text-slate-400">تعداد فاکتورها: {comparisonData.projectA.kpis.invoiceCount}</p>
              </div>

              {/* Proj B */}
              <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/60 p-5 shadow-xl space-y-3">
                <NeonBadge variant="green">{comparisonData.projectB.info?.name}</NeonBadge>
                <p className="text-slate-300">فروش کل: {comparisonData.projectB.kpis.totalSales.toLocaleString("fa-IR")} تومان</p>
                <p className="text-emerald-400 font-bold">سود ناخالص: {comparisonData.projectB.kpis.totalGrossProfit.toLocaleString("fa-IR")} تومان</p>
                <p className="text-slate-400">تعداد فاکتورها: {comparisonData.projectB.kpis.invoiceCount}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
