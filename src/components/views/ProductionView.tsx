"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import {
  Factory,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  Package,
  Layers
} from "lucide-react";

export const ProductionView: React.FC<{ selectedProjectId: string | null }> = ({ selectedProjectId }) => {
  const [batches, setBatches] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    productId: "",
    projectId: selectedProjectId || "",
    quantityToProduce: 10,
    laborCost: 0,
    overheadCost: 0,
    packagingCost: 0,
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchRes, prodRes, projRes] = await Promise.all([
        fetch("/api/production").then((r) => r.json()),
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
      ]);

      if (batchRes.success) setBatches(batchRes.batches || []);
      if (prodRes.success) setProducts(prodRes.products || []);
      if (projRes.success) setProjects(projRes.projects || []);
    } catch (err) {
      console.error("Error fetching production data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  const openModal = () => {
    setForm({
      productId: products[0]?.id || "",
      projectId: selectedProjectId || projects[0]?.id || "",
      quantityToProduce: 10,
      laborCost: 0,
      overheadCost: 0,
      packagingCost: 0,
      notes: "",
    });
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleExecuteProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || form.quantityToProduce <= 0) {
      setErrorMessage("انتخاب محصول و مقدار تولید الزامی است.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json());

      if (res.success) {
        setIsModalOpen(false);
        fetchData();
        alert("بچ تولید با موفقیت ثبت شد. مواد اولیه کسر و محصول نهایی به موجودی اضافه گردید.");
      } else {
        setErrorMessage(res.error || "خطا در ثبت بچ تولید");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Factory className="h-6 w-6 text-amber-400" />
            مدیریت بچ‌های تولید و مصرف مواد اولیه (BOM)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            کسر تراکنشی مواد اولیه از انبار ← محاسبه قیمت تمام شده بچ ← تولید محصول نهایی
          </p>
        </div>

        <button
          onClick={openModal}
          className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          ثبت بچ تولید جدید
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">شماره بچ تولید</th>
                <th className="p-4">محصول خروجی</th>
                <th className="p-4">پروژه</th>
                <th className="p-4">تعداد تولید</th>
                <th className="p-4">هزینه مواد اولیه</th>
                <th className="p-4">هزینه کل بچ (تومان)</th>
                <th className="p-4">بهای تمام شده واحد</th>
                <th className="p-4">تاریخ تولید</th>
                <th className="p-4">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/40 transition-all">
                  <td className="p-4 font-mono font-bold text-amber-300">{b.batchNumber}</td>
                  <td className="p-4 font-bold text-white">{b.productName}</td>
                  <td className="p-4 text-slate-400">{b.projectName}</td>
                  <td className="p-4 font-bold text-slate-200">{b.quantityProduced}</td>
                  <td className="p-4 text-slate-300">{Number(b.totalMaterialCost).toLocaleString("fa-IR")}</td>
                  <td className="p-4 font-bold text-emerald-400">{b.totalBatchCost.toLocaleString("fa-IR")}</td>
                  <td className="p-4 font-semibold text-sky-300">{b.unitCost.toLocaleString("fa-IR")}</td>
                  <td className="p-4 text-slate-400">{new Date(b.productionDate).toLocaleDateString("fa-IR")}</td>
                  <td className="p-4">
                    <NeonBadge variant="green">تکمیل شده</NeonBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Factory className="h-5 w-5 text-amber-400" />
                ثبت دستور تولید جدید (بچ تولید)
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleExecuteProduction} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">انتخاب محصول جهت تولید *</label>
                <select
                  value={form.productId}
                  onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">تعداد/مقدار تولید *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.quantityToProduce}
                    onChange={(e) => setForm({ ...form, quantityToProduce: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">پروژه مربوطه</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  >
                    <option value="">-- عمومی --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">هزینه دستمزد (تومان)</label>
                  <input
                    type="number"
                    value={form.laborCost}
                    onChange={(e) => setForm({ ...form, laborCost: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">هزینه سربار (تومان)</label>
                  <input
                    type="number"
                    value={form.overheadCost}
                    onChange={(e) => setForm({ ...form, overheadCost: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">هزینه بسته‌بندی</label>
                  <input
                    type="number"
                    value={form.packagingCost}
                    onChange={(e) => setForm({ ...form, packagingCost: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
              </div>

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
                  className="rounded-xl bg-amber-600 px-5 py-2 font-semibold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500"
                >
                  {saving ? "در حال پردازش تولید..." : "اجرا و ثبت بچ تولید"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
