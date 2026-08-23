"use client";

import React, { useEffect, useState, useCallback } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import {
  ShoppingBag,
  Plus,
  Printer,
  RotateCcw,
  RefreshCw,
  Search,
  CheckCircle,
  X,
  User,
  DollarSign,
  FileText
} from "lucide-react";

export const InvoicesView: React.FC<{ selectedProjectId: string | null }> = ({ selectedProjectId }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [reversingInvoice, setReversingInvoice] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    customerId: "",
    projectId: selectedProjectId || "",
    salesMode: "direct",
    employeeId: "",
    invoiceDiscount: 0,
    items: [] as { productId: string; quantity: number; unitPrice: number; discountAmount: number }[],
    initialPaymentAmount: 0,
    initialPaymentAccountId: "",
    notes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const projParam = selectedProjectId ? `?projectId=${selectedProjectId}` : "";
      const [invRes, custRes, projRes, prodRes, accRes, empRes] = await Promise.all([
        fetch(`/api/invoices${projParam}`).then((r) => r.json()),
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/reports?type=cashflow").then((r) => r.json()),
        fetch("/api/employees").then((r) => r.json()),
      ]);

      if (invRes.success) setInvoices(invRes.invoices || []);
      if (custRes.success) setCustomers(custRes.customers || []);
      if (projRes.success) setProjects(projRes.projects || []);
      if (prodRes.success) setProducts(prodRes.products || []);
      if (accRes.success) setAccounts(accRes.data?.accounts || []);
      if (empRes.success) setEmployees(empRes.employees || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setForm({
      customerId: customers[0]?.id || "",
      projectId: selectedProjectId || projects[0]?.id || "",
      salesMode: "direct",
      employeeId: employees[0]?.id || "",
      invoiceDiscount: 0,
      items: products.length > 0 ? [{ productId: products[0].id, quantity: 1, unitPrice: products[0].basePrice, discountAmount: 0 }] : [],
      initialPaymentAmount: 0,
      initialPaymentAccountId: accounts[0]?.id || "",
      notes: "",
    });
    setIsAddModalOpen(true);
  };

  const addLineItem = () => {
    if (products.length === 0) return;
    setForm({
      ...form,
      items: [
        ...form.items,
        { productId: products[0].id, quantity: 1, unitPrice: products[0].basePrice, discountAmount: 0 },
      ],
    });
  };

  const removeLineItem = (index: number) => {
    const updated = [...form.items];
    updated.splice(index, 1);
    setForm({ ...form, items: updated });
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    const updated = [...form.items];
    updated[index].productId = productId;
    if (prod) {
      updated[index].unitPrice = prod.basePrice;
    }
    setForm({ ...form, items: updated });
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || form.items.length === 0) {
      alert("انتخاب مشتری و حداقل یک قلم کالا الزامی است.");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        customerId: form.customerId,
        projectId: form.projectId || null,
        salesMode: form.salesMode,
        employeeId: form.employeeId || null,
        invoiceDiscount: form.invoiceDiscount,
        items: form.items,
        notes: form.notes,
      };

      if (form.initialPaymentAmount > 0 && form.initialPaymentAccountId) {
        payload.initialPayment = {
          amount: form.initialPaymentAmount,
          accountId: form.initialPaymentAccountId,
          paymentMethod: "pos",
        };
      }

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());

      if (res.success) {
        setIsAddModalOpen(false);
        fetchData();
      } else {
        alert(res.error || "خطا در ثبت فاکتور");
      }
    } catch (err: any) {
      alert(err.message || "خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const handleReverseInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingInvoice || !reversalReason) {
      alert("وارد کردن علت ابطال فاکتور الزامی است.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${reversingInvoice.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reverse", reason: reversalReason }),
      }).then((r) => r.json());

      if (res.success) {
        setReversingInvoice(null);
        fetchData();
        alert("فاکتور با موفقیت ابطال شد و آثار آن در انبار و حسابداری معکوس گردید.");
      } else {
        alert(res.error || "خطا در ابطال فاکتور");
      }
    } catch (err: any) {
      alert(err.message || "خطا در سیستم");
    } finally {
      setSaving(false);
    }
  };

  const calculateSubtotal = () => {
    return form.items.reduce((acc, item) => acc + item.quantity * item.unitPrice - item.discountAmount, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-blue-400" />
            صدور و مدیریت فاکتورهای فروش
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ارتباط خودکار فاکتور ← خروج از انبار ← طلب مشتری ← پورسانت ویزیتور ← سود ناخالص
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          صدور فاکتور جدید
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">شماره فاکتور</th>
                <th className="p-4">تاریخ صدور</th>
                <th className="p-4">نام مشتری</th>
                <th className="p-4">پروژه</th>
                <th className="p-4">ویزیتور</th>
                <th className="p-4">مبلغ کل (تومان)</th>
                <th className="p-4">دریافتی</th>
                <th className="p-4">مانده (طلب)</th>
                <th className="p-4">وضعیت</th>
                <th className="p-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-800/40 transition-all">
                  <td className="p-4 font-mono font-bold text-slate-300">{inv.invoiceNumber}</td>
                  <td className="p-4 text-slate-400">{new Date(inv.invoiceDate).toLocaleDateString("fa-IR")}</td>
                  <td className="p-4 font-semibold text-white">{inv.customerName}</td>
                  <td className="p-4 text-slate-400">{inv.projectName}</td>
                  <td className="p-4 text-slate-400">{inv.employeeName}</td>
                  <td className="p-4 font-bold text-emerald-400">{inv.grandTotal.toLocaleString("fa-IR")}</td>
                  <td className="p-4 text-slate-300">{inv.paidAmount.toLocaleString("fa-IR")}</td>
                  <td className="p-4 font-semibold text-rose-400">{inv.balanceDue.toLocaleString("fa-IR")}</td>
                  <td className="p-4">
                    {inv.status === "reversed" ? (
                      <NeonBadge variant="gray">ابطال شده</NeonBadge>
                    ) : (
                      <NeonBadge
                        variant={inv.paymentStatus === "paid" ? "green" : inv.paymentStatus === "partial" ? "yellow" : "red"}
                      >
                        {inv.paymentStatus === "paid" ? "تسویه شده" : inv.paymentStatus === "partial" ? "پرداخت جزیی" : "تسویه نشده"}
                      </NeonBadge>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/invoices/${inv.id}`).then((r) => r.json());
                          if (res.success) setViewingInvoice(res);
                        }}
                        title="مشاهده / چاپ فاکتور"
                        className="rounded-lg bg-blue-500/10 p-1.5 text-blue-400 hover:bg-blue-500/20"
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </button>
                      {inv.status !== "reversed" && (
                        <button
                          onClick={() => {
                            setReversingInvoice(inv);
                            setReversalReason("");
                          }}
                          title="ابطال فاکتور"
                          className="rounded-lg bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Invoice Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-400" />
                صدور فاکتور جدید
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">انتخاب مشتری *</label>
                  <select
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.storeName || c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">پروژه مربوطه</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">حالت فروش</label>
                  <select
                    value={form.salesMode}
                    onChange={(e) => setForm({ ...form, salesMode: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  >
                    <option value="direct">مستقیم (مراجعه مشتری)</option>
                    <option value="visitor">ویزیتوری (بازاریاب)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">ویزیتور / مسئول فروش</label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  >
                    <option value="">-- انتخاب ویزیتور --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">اقلام و محصولات فاکتور</span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-blue-400 font-semibold text-[11px] hover:underline"
                  >
                    + افزودن ردیف کالا
                  </button>
                </div>

                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl bg-slate-950 p-2 border border-slate-800">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-white"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.basePrice.toLocaleString("fa-IR")} تومان)
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      placeholder="تعداد"
                      value={item.quantity}
                      onChange={(e) => {
                        const updated = [...form.items];
                        updated[idx].quantity = Number(e.target.value);
                        setForm({ ...form, items: updated });
                      }}
                      className="w-16 rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-white text-center"
                    />

                    <input
                      type="number"
                      placeholder="فی"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const updated = [...form.items];
                        updated[idx].unitPrice = Number(e.target.value);
                        setForm({ ...form, items: updated });
                      }}
                      className="w-28 rounded-lg border border-slate-800 bg-slate-900 p-1.5 text-white text-emerald-400"
                    />

                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="text-rose-400 p-1 hover:text-rose-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Initial Payment */}
              <div className="border-t border-slate-800 pt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">مبلغ دریافتی اولیه (تومان)</label>
                  <input
                    type="number"
                    value={form.initialPaymentAmount}
                    onChange={(e) => setForm({ ...form, initialPaymentAmount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">واریز به حساب / صندوق</label>
                  <select
                    value={form.initialPaymentAccountId}
                    onChange={(e) => setForm({ ...form, initialPaymentAccountId: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 flex justify-between font-bold text-sm text-white">
                <span>مبلغ قابل پرداخت فاکتور:</span>
                <span className="text-emerald-400">{calculateSubtotal().toLocaleString("fa-IR")} تومان</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
                >
                  {saving ? "در حال ثبت فاکتور..." : "تایید و صدور نهایی فاکتور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reversal Modal */}
      {reversingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-rose-400" />
                ابطال فاکتور #{reversingInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setReversingInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-rose-300 bg-rose-950/40 p-3 rounded-xl border border-rose-500/30">
              هشدار: با ابطال این فاکتور، تمام کالاهای خروج یافته مجدداً به موجودی انبار بازگردانده شده و حساب طلب مشتری و پورسانت ثبت شده معکوس خواهند شد.
            </p>

            <form onSubmit={handleReverseInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">علت ابطال فاکتور *</label>
                <textarea
                  required
                  placeholder="مثلاً: انصراف مشتری یا اشتباه در ثبت اقلام"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setReversingInvoice(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-rose-600 px-5 py-2 font-semibold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500"
                >
                  {saving ? "در حال ابطال..." : "تایید و ابطال فاکتور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Print View Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl my-8 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">پیش‌فاکتور / فاکتور فروش رسمی</h1>
                <p className="text-xs text-slate-500 mt-1">شماره: {viewingInvoice.invoice.invoiceNumber}</p>
              </div>
              <button onClick={() => setViewingInvoice(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500">خریدار:</p>
                <p className="font-bold text-sm text-slate-900">{viewingInvoice.invoice.customerName}</p>
                <p className="text-slate-600">{viewingInvoice.invoice.customerAddress}</p>
              </div>
              <div className="text-left">
                <p className="text-slate-500">تاریخ صدور:</p>
                <p className="font-semibold text-slate-900">
                  {new Date(viewingInvoice.invoice.invoiceDate).toLocaleDateString("fa-IR")}
                </p>
                <p className="text-slate-500 mt-1">پروژه: {viewingInvoice.invoice.projectName}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-right text-xs border border-slate-200">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                <tr>
                  <th className="p-2 border-r">شرح کالا</th>
                  <th className="p-2 border-r text-center">تعداد</th>
                  <th className="p-2 border-r text-left">فی (تومان)</th>
                  <th className="p-2 text-left">جمع کل (تومان)</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b">
                {viewingInvoice.items.map((i: any) => (
                  <tr key={i.id}>
                    <td className="p-2 border-r font-semibold">{i.productNameSnapshot}</td>
                    <td className="p-2 border-r text-center">{i.quantity}</td>
                    <td className="p-2 border-r text-left">{i.unitPrice.toLocaleString("fa-IR")}</td>
                    <td className="p-2 text-left font-bold">{i.lineTotal.toLocaleString("fa-IR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end text-xs font-bold text-slate-900 space-y-1">
              <div className="w-64 space-y-1">
                <div className="flex justify-between p-1 bg-slate-50 rounded">
                  <span>مبلغ کل فاکتور:</span>
                  <span>{viewingInvoice.invoice.grandTotal.toLocaleString("fa-IR")} تومان</span>
                </div>
                <div className="flex justify-between p-1 text-emerald-600">
                  <span>پرداخت شده:</span>
                  <span>{viewingInvoice.invoice.paidAmount.toLocaleString("fa-IR")} تومان</span>
                </div>
                <div className="flex justify-between p-1 text-rose-600 border-t">
                  <span>باقیمانده (طلب):</span>
                  <span>{viewingInvoice.invoice.balanceDue.toLocaleString("fa-IR")} تومان</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                چاپ فاکتور (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
