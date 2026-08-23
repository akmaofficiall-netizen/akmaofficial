"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { Layers, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";

export const InventoryView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports?type=inventory").then((r) => r.json());
      if (res.success) setData(res.data);
    } catch (err) {
      console.error("Error fetching inventory data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const rawMaterials = data?.rawMaterials || [];
  const products = data?.products || [];
  const ledger = data?.recentLedger || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-sky-400" />
            انبارداری و دفتر کل گردش موجودی (Ledger)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دفتر کل انبار تنها منبع حقیقت موجودی کالاها و مواد اولیه (پشتیبانی از چند انبار)
          </p>
        </div>
      </div>

      {/* Summary Valuation */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <span className="text-xs text-slate-400">ارزش کل انبار مواد اولیه:</span>
          <h3 className="text-2xl font-bold text-sky-400 mt-2">
            {(data?.totalRawMaterialValue || 0).toLocaleString("fa-IR")} <span className="text-xs text-slate-400">تومان</span>
          </h3>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl">
          <span className="text-xs text-slate-400">تعداد اقلام زیر حد مجاز انبار:</span>
          <h3 className="text-2xl font-bold text-amber-400 mt-2">
            {rawMaterials.filter((r: any) => r.isLow).length} <span className="text-xs text-slate-400">قلم ماده اولیه</span>
          </h3>
        </div>
      </div>

      {/* Recent Ledger Transactions */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden space-y-3 p-5">
        <h3 className="text-sm font-bold text-white mb-2">تراکنش‌های اخیر دفتر کل انبار (Inventory Ledger)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">تاریخ</th>
                <th className="p-3">نوع آیتم</th>
                <th className="p-3">تراکنش</th>
                <th className="p-3">تغییر موجودی</th>
                <th className="p-3">قبل / بعد</th>
                <th className="p-3">نرخ واحد</th>
                <th className="p-3">توضیحات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {ledger.map((l: any) => (
                <tr key={l.id} className="hover:bg-slate-800/40">
                  <td className="p-3 text-slate-400">{new Date(l.createdAt).toLocaleDateString("fa-IR")}</td>
                  <td className="p-3 font-semibold text-white">{l.itemType === "product" ? "محصول" : "ماده اولیه"}</td>
                  <td className="p-3">
                    <NeonBadge variant={Number(l.quantityChange) > 0 ? "green" : "red"}>
                      {l.transactionType}
                    </NeonBadge>
                  </td>
                  <td className={`p-3 font-bold ${Number(l.quantityChange) > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {Number(l.quantityChange) > 0 ? "+" : ""}{Number(l.quantityChange)}
                  </td>
                  <td className="p-3 text-slate-400">{Number(l.quantityBefore)} ← {Number(l.quantityAfter)}</td>
                  <td className="p-3 text-slate-300">{Number(l.unitCostSnapshot).toLocaleString("fa-IR")} تومان</td>
                  <td className="p-3 text-slate-400">{l.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
