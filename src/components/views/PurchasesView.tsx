"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { ShoppingCart, Plus, RefreshCw, CheckCircle, X } from "lucide-react";

export const PurchasesView: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    supplierId: "",
    paidAmount: 0,
    items: [] as { itemId: string; quantity: number; unitCost: number }[],
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, rmRes] = await Promise.all([
        fetch("/api/purchases").then((r) => r.json()),
        fetch("/api/suppliers").then((r) => r.json()),
        fetch("/api/raw-materials").then((r) => r.json()),
      ]);

      if (purRes.success) setPurchases(purRes.purchases || []);
      if (supRes.success) setSuppliers(supRes.suppliers || []);
      if (rmRes.success) setRawMaterials(rmRes.rawMaterials || []);
    } catch (err) {
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = () => {
    setForm({
      supplierId: suppliers[0]?.id || "",
      paidAmount: 0,
      items: rawMaterials.length > 0 ? [{ itemId: rawMaterials[0].id, quantity: 10, unitCost: rawMaterials[0].currentCost }] : [],
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplierId || form.items.length === 0) {
      alert("انتخاب تامین کننده و حداقل یک قلم خرید الزامی است.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json());

      if (res.success) {
        setIsModalOpen(false);
        fetchData();
        alert("خرید با موفقیت ثبت شد و موجودی انبار مواد اولیه و قیمت آن به روز گردید.");
      } else {
        alert(res.error || "خطا در ثبت خرید");
      }
    } catch (err: any) {
      alert(err.message || "خطا در سیستم");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-emerald-400" />
            ثبت خریدهای مواد اولیه و تامین‌کنندگان
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ورود مواد اولیه به انبار ← بروزرسانی قیمت روز خرید ← محاسبه قیمت جدید موزون
          </p>
        </div>

        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          ثبت فاکتور خرید جدید
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">شماره خرید</th>
                <th className="p-4">تاریخ خرید</th>
                <th className="p-4">تامین‌کننده</th>
                <th className="p-4">مبلغ کل (تومان)</th>
                <th className="p-4">پرداخت شده</th>
                <th className="p-4">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-all">
                  <td className="p-4 font-mono font-bold text-emerald-400">{p.purchaseNumber}</td>
                  <td className="p-4 text-slate-400">{new Date(p.purchaseDate).toLocaleDateString("fa-IR")}</td>
                  <td className="p-4 font-bold text-white">{p.supplierName}</td>
                  <td className="p-4 font-bold text-slate-200">{p.grandTotal.toLocaleString("fa-IR")}</td>
                  <td className="p-4 text-emerald-400">{p.paidAmount.toLocaleString("fa-IR")}</td>
                  <td className="p-4">
                    <NeonBadge variant="green">تکمیل شده</NeonBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-emerald-400" />
                ثبت فاکتور خرید مواد اولیه
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">تامین‌کننده *</label>
                <select
                  value={form.supplierId}
                  onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {form.items.map((item, idx) => (
                <div key={idx} className="space-y-2 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <label className="block text-slate-400">ماده اولیه *</label>
                  <select
                    value={item.itemId}
                    onChange={(e) => {
                      const updated = [...form.items];
                      updated[idx].itemId = e.target.value;
                      setForm({ ...form, items: updated });
                    }}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-white"
                  >
                    {rawMaterials.map((rm) => (
                      <option key={rm.id} value={rm.id}>
                        {rm.name} ({rm.unit})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="مقدار"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...form.items];
                        updated[idx].quantity = Number(e.target.value);
                        setForm({ ...form, items: updated });
                      }}
                      className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-white font-bold"
                    />
                    <input
                      type="number"
                      placeholder="قیمت واحد (تومان)"
                      value={item.unitCost}
                      onChange={(e) => {
                        const updated = [...form.items];
                        updated[idx].unitCost = Number(e.target.value);
                        setForm({ ...form, items: updated });
                      }}
                      className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-white font-bold text-emerald-400"
                    />
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
                >
                  {saving ? "در حال ثبت..." : "ثبت فاکتور خرید"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
