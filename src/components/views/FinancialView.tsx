"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import {
  DollarSign,
  Plus,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Wallet,
  X,
  Building,
  Calendar,
  FileText
} from "lucide-react";
import { toJalaliDate, formatMoney, formatNumber } from "@/lib/dateUtils";

export const FinancialView: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashflow, setCashflow] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "rent",
    amount: 0,
    accountId: "",
    projectId: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [payRes, expRes, cfRes, projRes] = await Promise.all([
        fetch("/api/payments").then((r) => r.json()),
        fetch("/api/expenses").then((r) => r.json()),
        fetch("/api/reports?type=cashflow").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
      ]);

      if (payRes.success) setPayments(payRes.payments || []);
      if (expRes.success) setExpenses(expRes.expenses || []);
      if (cfRes.success) {
        setCashflow(cfRes.data || null);
        setAccounts(cfRes.data?.accounts || []);
      }
      if (projRes.success) setProjects(projRes.projects || []);
    } catch (err) {
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddExpense = () => {
    setExpenseForm({
      title: "",
      category: "rent",
      amount: 0,
      accountId: accounts[0]?.id || "",
      projectId: "",
      expenseDate: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || expenseForm.amount <= 0 || !expenseForm.accountId) {
      alert("عنوان هزینه، مبلغ و حساب پرداختی الزامی هستند.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseForm),
      }).then((r) => r.json());

      if (res.success) {
        setIsExpenseModalOpen(false);
        fetchData();
        alert("هزینه جاری با موفقیت ثبت شد.");
      } else {
        alert(res.error || "خطا در ثبت هزینه");
      }
    } catch (err: any) {
      alert(err.message || "خطا در سیستم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-400" />
            حسابداری، دریافت‌ها، هزینه‌ها و جریان نقدینگی (Cash Flow)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دفتر کل حساب‌های بانکی، صندوق‌ها، ریز دریافت‌های مشتریان و هزینه‌های جاری کسب‌وکار
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="بروزرسانی"
            className="rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
          <button
            onClick={openAddExpense}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
          >
            <Plus className="h-4 w-4" />
            + ثبت هزینه جاری
          </button>
        </div>
      </div>

      {/* Account Balances Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cashflow?.accounts?.map((acc: any) => (
          <div
            key={acc.id}
            className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-2 hover:border-emerald-500/30 transition"
          >
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                {acc.type === "cash" ? "صندوق نقدی ریالی" : "حساب بانکی"}
              </span>
              <NeonBadge variant="blue">{acc.code}</NeonBadge>
            </div>
            <h3 className="text-base font-bold text-white">{acc.name}</h3>
            <p className="text-xl font-bold text-emerald-400 font-mono">
              {formatMoney(acc.balance)}
            </p>
          </div>
        ))}
      </div>

      {/* Payments & Receipts List */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ArrowDownRight className="h-4 w-4 text-emerald-400" />
          دریافت‌ها و تراکنش‌های تسویه اخیر مشتریان
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">شماره سند</th>
                <th className="p-3.5">تاریخ ثبت (شمسی)</th>
                <th className="p-3.5">طرف حساب (مشتری)</th>
                <th className="p-3.5">حساب / صندوق مقصد</th>
                <th className="p-3.5">مبلغ واریزی</th>
                <th className="p-3.5">روش پرداخت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-mono font-bold text-cyan-300">{p.paymentNumber}</td>
                  <td className="p-3.5 text-slate-300">{toJalaliDate(p.paymentDate || p.createdAt, { showTime: true })}</td>
                  <td className="p-3.5 font-semibold text-white">{p.customerName}</td>
                  <td className="p-3.5 text-slate-400">{p.accountName}</td>
                  <td className="p-3.5 font-bold text-emerald-400 font-mono">{formatMoney(p.amount)}</td>
                  <td className="p-3.5 text-slate-300">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px]">
                      {p.paymentMethod === "pos"
                        ? "کارتخوان (POS)"
                        : p.paymentMethod === "cash"
                        ? "نقدی"
                        : p.paymentMethod === "card_transfer"
                        ? "کارت به کارت"
                        : p.paymentMethod === "bank_transfer"
                        ? "انتقال بانکی"
                        : p.paymentMethod || "سایر"}
                    </span>
                  </td>
                </tr>
              ))}
              {!payments.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    هنوز دریافتی ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses List */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-rose-400" />
          هزینه‌های جاری ثبت‌شده (قبوض، اجاره، حقوق، ایاب‌وذهاب و ...)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">عنوان هزینه</th>
                <th className="p-3.5">دسته‌بندی</th>
                <th className="p-3.5">تاریخ (شمسی)</th>
                <th className="p-3.5">پرداخت از حساب</th>
                <th className="p-3.5">مبلغ هزینه</th>
                <th className="p-3.5">پروژه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 font-semibold text-white">{exp.title}</td>
                  <td className="p-3.5 text-slate-400">{exp.category}</td>
                  <td className="p-3.5 text-slate-300">{toJalaliDate(exp.expenseDate || exp.createdAt)}</td>
                  <td className="p-3.5 text-slate-400">{exp.accountName || "صندوق اصلی"}</td>
                  <td className="p-3.5 font-bold text-rose-400 font-mono">{formatMoney(exp.amount)}</td>
                  <td className="p-3.5 text-slate-400">{exp.projectName || "عمومی"}</td>
                </tr>
              ))}
              {!expenses.length && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    هزینه‌ای ثبت نشده است.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Expense */}
      {isExpenseModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsExpenseModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                ثبت سند هزینه جدید
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  شرح و عنوان هزینه <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  placeholder="مثال: هزینه بسته‌بندی، اجاره دفتر، قبوض، ایاب‌وذهاب"
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    مبلغ هزینه (تومان) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="مبلغ به تومان"
                    value={expenseForm.amount || ""}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-rose-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">دسته‌بندی هزینه:</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-white"
                  >
                    <option value="rent">اجاره و رهن</option>
                    <option value="utilities">قبوض (آب، برق، گاز، اینترنت)</option>
                    <option value="salary">حقوق و دستمزد</option>
                    <option value="transport">حمل و نقل و ایاب ذهاب</option>
                    <option value="packaging">ملزومات و بسته‌بندی</option>
                    <option value="marketing">تبلیغات و بازاریابی</option>
                    <option value="other">سایر هزینه‌های جاری</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    پرداخت از حساب / صندوق <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={expenseForm.accountId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, accountId: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatMoney(a.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">پروژه مرتبط:</label>
                  <select
                    value={expenseForm.projectId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, projectId: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-white"
                  >
                    <option value="">-- بدون پروژه (عمومی) --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">توضیحات و شماره فاکتور یا سند:</label>
                <textarea
                  rows={2}
                  placeholder="توضیحات تکمیلی..."
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  انصراف و بستن
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
                >
                  {saving ? "در حال ثبت..." : "ثبت نهایی هزینه"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
