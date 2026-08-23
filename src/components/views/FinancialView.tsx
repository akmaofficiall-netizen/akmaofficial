"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { DollarSign, Plus, RefreshCw, ArrowUpRight, ArrowDownRight, CreditCard, Wallet } from "lucide-react";

export const FinancialView: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashflow, setCashflow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, expRes, cfRes] = await Promise.all([
        fetch("/api/payments").then((r) => r.json()),
        fetch("/api/expenses").then((r) => r.json()),
        fetch("/api/reports?type=cashflow").then((r) => r.json()),
      ]);

      if (payRes.success) setPayments(payRes.payments || []);
      if (expRes.success) setExpenses(expRes.expenses || []);
      if (cfRes.success) setCashflow(cfRes.data || null);
    } catch (err) {
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-400" />
            حسابداری، دریافت‌ها، هزینه‌ها و جریان نقدینگی (Cash Flow)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دفتر کل حساب‌های بانکی، صندق، ریز دریافت‌های مشتریان و هزینه‌های جاری کسب‌وکار
          </p>
        </div>
      </div>

      {/* Account Balances Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cashflow?.accounts?.map((acc: any) => (
          <div key={acc.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>{acc.type === "cash" ? "صندوق ریالی" : "حساب بانکی"}</span>
              <NeonBadge variant="blue">{acc.code}</NeonBadge>
            </div>
            <h3 className="text-base font-bold text-white">{acc.name}</h3>
            <p className="text-xl font-bold text-emerald-400">
              {Number(acc.balance).toLocaleString("fa-IR")} <span className="text-xs text-slate-400 font-normal">تومان</span>
            </p>
          </div>
        ))}
      </div>

      {/* Payments & Receipts List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">دریافت‌ها و تراکنش‌های مالی اخیر</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">شماره تراکنش</th>
                <th className="p-3">تاریخ</th>
                <th className="p-3">طرف حساب</th>
                <th className="p-3">حساب مقصود</th>
                <th className="p-3">مبلغ (تومان)</th>
                <th className="p-3">روش پرداخت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="p-3 font-mono font-bold text-slate-300">{p.paymentNumber}</td>
                  <td className="p-3 text-slate-400">{new Date(p.paymentDate).toLocaleDateString("fa-IR")}</td>
                  <td className="p-3 font-semibold text-white">{p.customerName}</td>
                  <td className="p-3 text-slate-400">{p.accountName}</td>
                  <td className="p-3 font-bold text-emerald-400">{p.amount.toLocaleString("fa-IR")}</td>
                  <td className="p-3 text-slate-300">{p.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
