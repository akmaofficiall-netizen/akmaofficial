"use client";

import React, { useEffect, useState } from "react";
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
  FileText,
  Calendar,
  CreditCard,
  Building
} from "lucide-react";
import { toJalaliDate, formatMoney, formatNumber } from "@/lib/dateUtils";

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
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<any[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    accountId: "",
    paymentMethod: "pos",
    referenceNumber: "",
    notes: "",
  });

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

  const fetchData = async () => {
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
      if (accRes.success) setAccounts(accRes.accounts || []);
      if (empRes.success) setEmployees(empRes.employees || []);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  const openAddModal = () => {
    setForm({
      customerId: customers[0]?.id || "",
      projectId: selectedProjectId || projects[0]?.id || "",
      salesMode: "direct",
      employeeId: "",
      invoiceDiscount: 0,
      items: products.length > 0 ? [{ productId: products[0].id, quantity: 1, unitPrice: products[0].basePrice, discountAmount: 0 }] : [],
      initialPaymentAmount: 0,
      initialPaymentAccountId: accounts[0]?.id || "",
      notes: "",
    });
    setIsAddModalOpen(true);
  };

  const handleProductChange = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const updated = [...form.items];
    updated[index] = {
      ...updated[index],
      productId,
      unitPrice: prod.basePrice,
    };
    setForm({ ...form, items: updated });
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
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || form.items.length === 0) {
      alert("مشتری و حداقل یک قلم کالا الزامی است.");
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
        alert(res.error || "خطا در صدور فاکتور");
      }
    } catch (err: any) {
      alert(err.message || "خطا در سیستم");
    } finally {
      setSaving(false);
    }
  };

  const handleReverseInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingInvoice || !reversalReason.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${reversingInvoice.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reversalReason }),
      }).then((r) => r.json());

      if (res.success) {
        setReversingInvoice(null);
        fetchData();
      } else {
        alert(res.error || "خطا در ابطال فاکتور");
      }
    } catch (err: any) {
      alert(err.message || "خطا در سیستم");
    } finally {
      setSaving(false);
    }
  };

  const openEditInvoice = async (inv: any) => {
    const res = await fetch(`/api/invoices/${inv.id}`).then((r) => r.json());
    if (!res.success) return alert(res.error || "خطا");
    setEditingInvoice({
      ...res.invoice,
      dueDate: res.invoice.dueDate ? String(res.invoice.dueDate).slice(0, 10) : "",
    });
    setInvoicePayments(res.payments || []);
    setPaymentForm({
      amount: 0,
      accountId: accounts[0]?.id || "",
      paymentMethod: "pos",
      referenceNumber: "",
      notes: "",
    });
  };

  const saveInvoiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${editingInvoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceDate: editingInvoice.invoiceDate,
          dueDate: editingInvoice.dueDate,
          notes: editingInvoice.notes,
        }),
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.error || "خطا");
      setEditingInvoice(null);
      fetchData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addInvoicePayment = async () => {
    if (!editingInvoice || !paymentForm.accountId || paymentForm.amount <= 0)
      return alert("مبلغ و حساب واریزی را مشخص نمایید.");
    setSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: editingInvoice.id,
          customerId: editingInvoice.customerId,
          projectId: editingInvoice.projectId,
          accountId: paymentForm.accountId,
          amount: paymentForm.amount,
          paymentMethod: paymentForm.paymentMethod,
          referenceNumber: paymentForm.referenceNumber,
          notes: paymentForm.notes,
        }),
      }).then((r) => r.json());
      if (!res.success) throw new Error(res.error || "خطا در ثبت پرداخت");
      const next = await fetch(`/api/invoices/${editingInvoice.id}`).then((r) => r.json());
      if (next.success) {
        setEditingInvoice(next.invoice);
        setInvoicePayments(next.payments || []);
      }
      setPaymentForm({
        amount: 0,
        accountId: accounts[0]?.id || "",
        paymentMethod: "pos",
        referenceNumber: "",
        notes: "",
      });
      fetchData();
    } catch (e: any) {
      alert(e.message);
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
            مشاهده تمام فاکتورهای صادرشده توسط مدیریت و ویزیتورها، ارتباط خودکار با انبار، طلب مشتری و پورسانت
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="بروزرسانی"
            className="rounded-xl border border-slate-700 bg-slate-900 p-2 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            + صدور فاکتور جدید
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <ShoppingBag className="h-10 w-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium">فاکتوری برای این پروژه یا بازه زمانی یافت نشد.</p>
            <button
              onClick={openAddModal}
              className="mt-3 inline-flex items-center gap-1 text-xs bg-blue-600 px-4 py-2 rounded-xl text-white hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              صدور اولین فاکتور
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-4">شماره فاکتور</th>
                  <th className="p-4">تاریخ صدور (شمسی)</th>
                  <th className="p-4">نام خریدار / فروشگاه</th>
                  <th className="p-4">پروژه</th>
                  <th className="p-4">ویزیتور / مسئول</th>
                  <th className="p-4">مبلغ کل فاکتور</th>
                  <th className="p-4">دریافتی</th>
                  <th className="p-4">مانده (طلب)</th>
                  <th className="p-4">وضعیت تسویه</th>
                  <th className="p-4 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="p-4 font-mono font-bold text-cyan-400">{inv.invoiceNumber}</td>
                    <td className="p-4 text-slate-300 font-medium">{toJalaliDate(inv.invoiceDate)}</td>
                    <td className="p-4 font-semibold text-white">{inv.customerName}</td>
                    <td className="p-4 text-slate-400">{inv.projectName}</td>
                    <td className="p-4 text-slate-400">{inv.employeeName}</td>
                    <td className="p-4 font-bold text-emerald-400">{formatMoney(inv.grandTotal)}</td>
                    <td className="p-4 text-slate-300">{formatMoney(inv.paidAmount)}</td>
                    <td className="p-4 font-semibold text-rose-400">{formatMoney(inv.balanceDue)}</td>
                    <td className="p-4">
                      {inv.status === "reversed" ? (
                        <NeonBadge variant="gray">ابطال شده</NeonBadge>
                      ) : (
                        <NeonBadge
                          variant={
                            inv.paymentStatus === "paid"
                              ? "green"
                              : inv.paymentStatus === "partial"
                              ? "yellow"
                              : "red"
                          }
                        >
                          {inv.paymentStatus === "paid"
                            ? "تسویه کامل"
                            : inv.paymentStatus === "partial"
                            ? "پرداخت جزیی"
                            : "تسویه نشده"}
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
                          title="مشاهده و چاپ فاکتور"
                          className="rounded-lg bg-blue-500/10 p-2 text-blue-400 hover:bg-blue-500/20"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {inv.status !== "reversed" && (
                          <button
                            onClick={() => openEditInvoice(inv)}
                            title="ثبت دریافتی و تسویه"
                            className="rounded-lg bg-cyan-500/10 p-2 text-cyan-300 hover:bg-cyan-500/20"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                        )}
                        {inv.status !== "reversed" && (
                          <button
                            onClick={() => {
                              setReversingInvoice(inv);
                              setReversalReason("");
                            }}
                            title="ابطال فاکتور"
                            className="rounded-lg bg-rose-500/10 p-2 text-rose-400 hover:bg-rose-500/20"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal 1: Add Invoice */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-blue-400" />
                صدور فاکتور فروش جدید
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white hover:bg-slate-900 transition flex items-center gap-1 text-xs"
              >
                <X className="h-4 w-4" />
                <span>بستن</span>
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    انتخاب خریدار / مشتری <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={form.customerId}
                    onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.storeName || c.mobile})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">پروژه مربوطه:</label>
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">حالت فروش:</label>
                  <select
                    value={form.salesMode}
                    onChange={(e) => setForm({ ...form, salesMode: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
                  >
                    <option value="direct">فروش مستقیم حضوری یا تلفنی</option>
                    <option value="visitor">فروش میدانی ویزیتوری</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">ویزیتور / مسئول فروش:</label>
                  <select
                    value={form.employeeId}
                    onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
                  >
                    <option value="">-- انتخاب ویزیتور یا مسئول --</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} ({e.role || "همکار"})
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
                    className="text-cyan-400 font-semibold text-xs hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    + افزودن ردیف کالا
                  </button>
                </div>

                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-xl bg-slate-900 p-2.5 border border-slate-800">
                    <select
                      value={item.productId}
                      onChange={(e) => handleProductChange(idx, e.target.value)}
                      className="flex-1 rounded-lg border border-slate-800 bg-slate-950 p-2 text-white text-xs"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatMoney(p.basePrice)})
                        </option>
                      ))}
                    </select>

                    <div className="w-20">
                      <input
                        type="number"
                        min="1"
                        placeholder="تعداد"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...form.items];
                          updated[idx].quantity = Number(e.target.value);
                          setForm({ ...form, items: updated });
                        }}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-white text-center text-xs font-bold"
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        placeholder="قیمت واحد"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updated = [...form.items];
                          updated[idx].unitPrice = Number(e.target.value);
                          setForm({ ...form, items: updated });
                        }}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2 text-emerald-400 text-xs font-bold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="text-rose-400 p-1.5 hover:text-rose-300 rounded-lg hover:bg-rose-950/30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Initial Payment */}
              <div className="border-t border-slate-800 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">مبلغ دریافتی نقد اولیه (تومان):</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="مبلغ دریافتی نقدی اولیه"
                    value={form.initialPaymentAmount}
                    onChange={(e) => setForm({ ...form, initialPaymentAmount: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white font-bold text-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">واریز به حساب / صندوق:</label>
                  <select
                    value={form.initialPaymentAccountId}
                    onChange={(e) => setForm({ ...form, initialPaymentAccountId: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">توضیحات و شرایط ارسال فاکتور:</label>
                <textarea
                  rows={2}
                  placeholder="توضیحات..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
                />
              </div>

              <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800 flex justify-between font-bold text-sm text-white">
                <span>مجموع کل فاکتور:</span>
                <span className="text-emerald-400 text-base">{formatMoney(calculateSubtotal())}</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  انصراف و بستن
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition"
                >
                  {saving ? "در حال ثبت..." : "تأیید و صدور نهایی فاکتور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit & Payment Settlement */}
      {editingInvoice && (
        <div
          className="fixed inset-0 z-[65] bg-black/80 flex items-center justify-center p-4 overflow-y-auto backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingInvoice(null);
          }}
        >
          <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-950 p-6 space-y-5 my-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-cyan-400" />
                ثبت تسویه و ویرایش فاکتور #{editingInvoice.invoiceNumber}
              </h3>
              <button
                onClick={() => setEditingInvoice(null)}
                className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="rounded-2xl bg-slate-900 p-3.5 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">مبلغ کل فاکتور</span>
                <b className="text-white text-sm">{formatMoney(editingInvoice.grandTotal)}</b>
              </div>
              <div className="rounded-2xl bg-slate-900 p-3.5 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">تسویه شده</span>
                <b className="text-emerald-400 text-sm">{formatMoney(editingInvoice.paidAmount)}</b>
              </div>
              <div className="rounded-2xl bg-slate-900 p-3.5 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">مانده بدهی</span>
                <b className="text-rose-400 text-sm">{formatMoney(editingInvoice.balanceDue)}</b>
              </div>
              <div className="rounded-2xl bg-slate-900 p-3.5 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">وضعیت پرداخت</span>
                <b className="text-cyan-300 text-sm">
                  {editingInvoice.paymentStatus === "paid"
                    ? "تسویه کامل"
                    : editingInvoice.paymentStatus === "partial"
                    ? "پرداخت جزیی"
                    : "تسویه نشده"}
                </b>
              </div>
            </div>

            {/* Payment Register */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                ثبت دریافتی / تسویه جدید برای این فاکتور:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">مبلغ پرداختی (تومان):</label>
                  <input
                    type="number"
                    value={paymentForm.amount || ""}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    placeholder="مبلغ به تومان"
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">حساب / صندوق مقصد:</label>
                  <select
                    value={paymentForm.accountId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, accountId: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
                  >
                    <option value="">-- انتخاب حساب --</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">روش پرداخت:</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
                  >
                    <option value="pos">دستگاه کارتخوان (POS)</option>
                    <option value="cash">نقدی</option>
                    <option value="card_transfer">کارت به کارت</option>
                    <option value="bank_transfer">انتقال پایا / ساتنا</option>
                    <option value="cheque">چک صیادی</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={addInvoicePayment}
                    disabled={saving}
                    className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
                  >
                    + ثبت دریافتی
                  </button>
                </div>
              </div>
            </div>

            {/* Payments list */}
            <div className="space-y-2 text-xs border-t border-slate-800 pt-3">
              <h4 className="font-bold text-white">تاریخچه واریزی‌ها و پرداخت‌ها:</h4>
              {invoicePayments.map((p: any) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center rounded-xl bg-slate-900/80 p-3 border border-slate-800"
                >
                  <div>
                    <span className="font-bold text-white">{p.paymentNumber}</span>
                    <span className="text-slate-400 mr-2">· روش: {p.paymentMethod}</span>
                    <span className="text-slate-500 mr-2 font-mono">
                      ({toJalaliDate(p.createdAt, { showTime: true })})
                    </span>
                  </div>
                  <b className="text-emerald-400 font-mono text-sm">{formatMoney(p.amount)}</b>
                </div>
              ))}
              {!invoicePayments.length && (
                <p className="text-xs text-slate-500 p-3 bg-slate-900/30 rounded-xl border border-dashed border-slate-800 text-center">
                  هنوز پرداختی برای این فاکتور ثبت نشده است.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingInvoice(null)}
                className="rounded-xl border border-slate-700 px-5 py-2 text-xs text-slate-300 hover:text-white"
              >
                بستن پنجره
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Reversal */}
      {reversingInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setReversingInvoice(null);
          }}
        >
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-rose-400" />
                ابطال فاکتور #{reversingInvoice.invoiceNumber}
              </h3>
              <button onClick={() => setReversingInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-rose-300 bg-rose-950/40 p-3 rounded-2xl border border-rose-500/30">
              هشدار: با ابطال این فاکتور، تمام کالاهای خروج یافته مجدداً به موجودی انبار بازگردانده شده و مانده بدهی مشتری و پورسانت ثبت شده کسر می‌گردد.
            </p>

            <form onSubmit={handleReverseInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  علت ابطال فاکتور <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  placeholder="مثلاً: انصراف مشتری یا اشتباه در ثبت اقلام"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white h-20"
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
                  className="rounded-xl bg-rose-600 px-5 py-2 font-bold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500"
                >
                  {saving ? "در حال ابطال..." : "تأیید و ابطال فاکتور"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Print/View Invoice */}
      {viewingInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewingInvoice(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl my-8 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">فاکتور فروش رسمی آکما</h1>
                <p className="text-xs text-slate-500 mt-1">شماره: {viewingInvoice.invoice.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setViewingInvoice(null)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl"
              >
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
                <p className="text-slate-500">تاریخ صدور (شمسی):</p>
                <p className="font-semibold text-slate-900">{toJalaliDate(viewingInvoice.invoice.invoiceDate)}</p>
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
                    <td className="p-2 border-r text-center font-bold">{i.quantity}</td>
                    <td className="p-2 border-r text-left font-mono">{formatMoney(i.unitPrice)}</td>
                    <td className="p-2 text-left font-bold font-mono">{formatMoney(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end text-xs font-bold text-slate-900 space-y-1">
              <div className="w-64 space-y-1">
                <div className="flex justify-between p-1 bg-slate-50 rounded">
                  <span>مبلغ کل فاکتور:</span>
                  <span>{formatMoney(viewingInvoice.invoice.grandTotal)}</span>
                </div>
                <div className="flex justify-between p-1 text-emerald-600">
                  <span>پرداخت شده:</span>
                  <span>{formatMoney(viewingInvoice.invoice.paidAmount)}</span>
                </div>
                <div className="flex justify-between p-1 text-rose-600 border-t">
                  <span>باقیمانده (طلب):</span>
                  <span>{formatMoney(viewingInvoice.invoice.balanceDue)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => setViewingInvoice(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                بستن پیش‌نمایش
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
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
