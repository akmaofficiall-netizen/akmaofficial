"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  FilePlus2,
  LogOut,
  Plus,
  Receipt,
  RefreshCcw,
  Users,
  Wallet,
  X,
  MapPin,
  Phone,
  Building,
  CheckCircle2,
  Calendar,
  CreditCard,
  Edit2
} from "lucide-react";
import { toJalaliDate, formatMoney, formatNumber } from "@/lib/dateUtils";
import { InteractiveMapPicker } from "@/components/maps/InteractiveMapPicker";

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [dash, setDash] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any>({ products: [], projects: [], accounts: [] });
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [showCustomer, setShowCustomer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [editInvoice, setEditInvoice] = useState<any | null>(null);

  const [customerForm, setCustomerForm] = useState<any>({
    name: "",
    storeName: "",
    mobile: "",
    phone: "",
    address: "",
    city: "تهران",
    latitude: null as number | null,
    longitude: null as number | null,
    notes: "",
    projectId: "",
  });

  const [invoiceForm, setInvoiceForm] = useState<any>({
    customerId: "",
    projectId: "",
    items: [{ productId: "", quantity: 1, unitPrice: "" }],
    notes: "",
    dueDate: "",
    initialPaymentAmount: "",
    accountId: "",
    paymentMethod: "pos",
  });

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const m = await fetch("/api/auth/employee-me", { cache: "no-store" }).then((x) => x.json());
      if (!m.success) {
        router.push("/employee-login");
        return;
      }
      setMe(m.employee);

      const [d, c, i, cat] = await Promise.all([
        fetch(`/api/employees/${m.employee.id}/dashboard`, { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/customers?mine=1", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/invoices?mine=1", { cache: "no-store" }).then((x) => x.json()),
        fetch("/api/employee/catalog", { cache: "no-store" }).then((x) => x.json()),
      ]);

      if (d.success) setDash(d.dashboard);
      if (c.success) setCustomers(c.customers || []);
      if (i.success) setInvoices(i.invoices || []);
      if (cat.success) setCatalog(cat);
      else if (cat.error) setError(cat.error);
    } catch (e: any) {
      setError(e?.message || "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const total = useMemo(
    () =>
      invoiceForm.items.reduce(
        (s: number, x: any) => s + (Number(x.quantity) || 0) * (Number(x.unitPrice) || 0),
        0
      ),
    [invoiceForm.items]
  );

  const products = catalog.products || [];
  const projects = catalog.projects || [];
  const accounts = catalog.accounts || [];

  function selectProduct(i: number, id: string) {
    const p = products.find((x: any) => x.id === id);
    setInvoiceForm((f: any) => {
      const items = [...f.items];
      items[i] = { ...items[i], productId: id, unitPrice: p?.basePrice ?? "" };
      return { ...f, items };
    });
  }

  function updateItem(i: number, k: string, v: any) {
    setInvoiceForm((f: any) => {
      const items = [...f.items];
      items[i] = { ...items[i], [k]: v };
      return { ...f, items };
    });
  }

  const openCustomerModal = (cust: any = null) => {
    if (cust) {
      setEditingCustomer(cust);
      setCustomerForm({
        name: cust.name || "",
        storeName: cust.storeName || "",
        mobile: cust.mobile || "",
        phone: cust.phone || "",
        address: cust.address || "",
        city: cust.city || "تهران",
        latitude: cust.latitude ? Number(cust.latitude) : null,
        longitude: cust.longitude ? Number(cust.longitude) : null,
        notes: cust.notes || "",
        projectId: cust.projectId || "",
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({
        name: "",
        storeName: "",
        mobile: "",
        phone: "",
        address: "",
        city: "تهران",
        latitude: null,
        longitude: null,
        notes: "",
        projectId: projects[0]?.id || "",
      });
    }
    setShowCustomer(true);
  };

  async function saveCustomer(e: any) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : "/api/customers";
      const method = editingCustomer ? "PUT" : "POST";

      const x = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(customerForm),
      }).then((r) => r.json());

      if (!x.success) throw Error(x.error);
      setShowCustomer(false);
      setEditingCustomer(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveInvoice(e: any) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!invoiceForm.customerId || invoiceForm.items.some((x: any) => !x.productId || Number(x.quantity) <= 0)) {
        throw Error("انتخاب مشتری و حداقل یک کالا با تعداد معتبر الزامی است.");
      }

      const initial = Number(invoiceForm.initialPaymentAmount || 0);
      if (initial > 0 && !invoiceForm.accountId) {
        throw Error("برای ثبت پرداخت اولیه، انتخاب حساب واریزی الزامی است.");
      }

      const x = await fetch("/api/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerId: invoiceForm.customerId,
          projectId: invoiceForm.projectId || null,
          salesMode: "visitor",
          employeeId: me.id,
          items: invoiceForm.items.map((x: any) => ({
            productId: x.productId,
            quantity: Number(x.quantity),
            unitPrice: Number(x.unitPrice) || undefined,
          })),
          notes: invoiceForm.notes || undefined,
          dueDate: invoiceForm.dueDate || undefined,
          initialPayment:
            initial > 0
              ? {
                  amount: initial,
                  accountId: invoiceForm.accountId,
                  paymentMethod: invoiceForm.paymentMethod,
                }
              : undefined,
        }),
      }).then((r) => r.json());

      if (!x.success) throw Error(x.error);
      setShowInvoice(false);
      setInvoiceForm({
        customerId: "",
        projectId: "",
        items: [{ productId: "", quantity: 1, unitPrice: "" }],
        notes: "",
        dueDate: "",
        initialPaymentAmount: "",
        accountId: "",
        paymentMethod: "pos",
      });
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateInvoice(e: any) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const x = await fetch(`/api/invoices/${editInvoice.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          notes: editInvoice.notes,
          dueDate: editInvoice.dueDate || null,
        }),
      }).then((r) => r.json());
      if (!x.success) throw Error(x.error);
      setEditInvoice(null);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function markPaid(inv: any) {
    const def = accounts.find((a: any) => a.isDefault) || accounts[0];
    if (!def) {
      setError("هیچ حساب دریافت فعالی در سیستم تعریف نشده است.");
      return;
    }
    if (!confirm(`فاکتور ${inv.invoiceNumber} به مبلغ ${formatMoney(inv.balanceDue)} از طریق حساب «${def.name}» تسویه شود؟`))
      return;
    setBusy(true);
    setError("");
    try {
      const x = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          accountId: def.id,
          amount: Number(inv.balanceDue),
          customerId: inv.customerId,
          invoiceId: inv.id,
          projectId: inv.projectId,
          paymentType: "customer_receipt",
          paymentMethod: "pos",
          notes: `تسویه فاکتور ${inv.invoiceNumber}`,
        }),
      }).then((r) => r.json());
      if (!x.success) throw Error(x.error);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/employee-logout", { method: "POST" });
    router.push("/employee-login");
  }

  if (loading && !me) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans">
        <div className="flex items-center gap-3">
          <RefreshCcw className="h-6 w-6 animate-spin text-cyan-400" />
          <span>در حال دریافت اطلاعات پنل همکار...</span>
        </div>
      </main>
    );
  }

  if (!me) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-4 md:p-6 dir-rtl font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="text-cyan-400">پنل همکار و ویزیتور</span>
              <span>· {me.name}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              کد پرسنلی: <span className="font-mono text-cyan-300">{me.code}</span> · سمت: {me.role || "همکار فروش"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAll}
              className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
              به‌روزرسانی
            </button>
            <button
              onClick={logout}
              className="rounded-xl border border-slate-800 bg-rose-950/30 px-3.5 py-2 text-xs flex items-center gap-1.5 text-rose-300 hover:bg-rose-900/50 transition"
            >
              <LogOut className="h-4 w-4" />
              خروج از حساب
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-200 p-4 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap gap-2">
          <button
            onClick={() => setTab("overview")}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition ${
              tab === "overview" ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20" : "border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white"
            }`}
          >
            داشبورد کلی
          </button>
          <button
            onClick={() => setTab("customers")}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition ${
              tab === "customers" ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20" : "border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white"
            }`}
          >
            مشتریان من ({customers.length})
          </button>
          <button
            onClick={() => setTab("invoices")}
            className={`rounded-xl px-5 py-2.5 text-xs font-bold transition ${
              tab === "invoices" ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20" : "border border-slate-800 bg-slate-900/70 text-slate-300 hover:text-white"
            }`}
          >
            فاکتورهای من ({invoices.length})
          </button>
          <button
            onClick={() => openCustomerModal()}
            className="rounded-xl bg-emerald-500 text-slate-950 px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-400 transition"
          >
            <Plus className="h-4 w-4" />
            + تعریف مشتری جدید
          </button>
          <button
            onClick={() => setShowInvoice(true)}
            className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-500 transition"
          >
            <FilePlus2 className="h-4 w-4" />
            + صدور فاکتور جدید
          </button>
        </nav>

        {/* Tab 1: Overview */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 space-y-2">
                <Receipt className="h-5 w-5 text-cyan-400" />
                <p className="text-xs text-slate-400">فروش امروز</p>
                <b className="text-xl font-bold text-white block">{formatMoney(dash?.todaySales || 0)}</b>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 space-y-2">
                <Wallet className="h-5 w-5 text-emerald-400" />
                <p className="text-xs text-slate-400">فروش کل دوره</p>
                <b className="text-xl font-bold text-white block">{formatMoney(dash?.periodSales || 0)}</b>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 space-y-2">
                <Users className="h-5 w-5 text-purple-400" />
                <p className="text-xs text-slate-400">مشتریان فعال تحت پوشش</p>
                <b className="text-xl font-bold text-white block">{dash?.activeCustomers || customers.length} نفر</b>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 space-y-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <p className="text-xs text-slate-400">پورسانت پرداخت‌نشده</p>
                <b className="text-xl font-bold text-amber-300 block">{formatMoney(dash?.unpaidCommission || 0)}</b>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="font-bold text-sm text-white mb-3">آخرین فاکتورهای صادرشده توسط شما</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-300 text-right">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="p-3">شماره فاکتور</th>
                      <th className="p-3">تاریخ (شمسی)</th>
                      <th className="p-3">نام مشتری</th>
                      <th className="p-3">مبلغ کل</th>
                      <th className="p-3">وضعیت پرداخت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {invoices.slice(0, 8).map((x: any) => (
                      <tr key={x.id} className="hover:bg-slate-800/40">
                        <td className="p-3 font-mono font-bold text-cyan-300">{x.invoiceNumber}</td>
                        <td className="p-3 text-slate-400">{toJalaliDate(x.invoiceDate || x.createdAt)}</td>
                        <td className="p-3 font-semibold text-white">{x.customerName}</td>
                        <td className="p-3 font-bold text-emerald-400">{formatMoney(x.grandTotal)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              x.paymentStatus === "paid"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : x.paymentStatus === "partial"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-rose-500/20 text-rose-300"
                            }`}
                          >
                            {x.paymentStatus === "paid"
                              ? "تسویه شده"
                              : x.paymentStatus === "partial"
                              ? "پرداخت ناقص"
                              : "تسویه نشده"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!invoices.length && (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          هنوز فاکتوری ثبت نکرده‌اید.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Customers */}
        {tab === "customers" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white">مشتریان تحت پوشش من</h2>
                <p className="text-xs text-slate-400">ثبت مشتریان جدید، ویرایش اطلاعات و ثبت لوکیشن روی نقشه (اختیاری)</p>
              </div>
              <button
                onClick={() => openCustomerModal()}
                className="rounded-xl bg-emerald-500 text-slate-950 px-4 py-2 text-xs font-bold hover:bg-emerald-400 transition flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                + مشتری جدید
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300 text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-3">نام و مسئول</th>
                    <th className="p-3">شماره همراه</th>
                    <th className="p-3">فروشگاه / داروخانه</th>
                    <th className="p-3">موقعیت نقشه</th>
                    <th className="p-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customers.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-semibold text-white">{c.name}</td>
                      <td className="p-3 font-mono text-cyan-300">{c.mobile}</td>
                      <td className="p-3 text-slate-300">{c.storeName || "—"}</td>
                      <td className="p-3">
                        {c.latitude && c.longitude ? (
                          <span className="text-emerald-400 font-medium">دارای لوکیشن</span>
                        ) : (
                          <span className="text-slate-500">بدون لوکیشن</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => openCustomerModal(c)}
                          className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-cyan-300 hover:text-white hover:bg-slate-700 transition flex items-center gap-1 mx-auto"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          ویرایش
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!customers.length && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        مشتری تحت پوشش شما یافت نشد.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tab 3: Invoices */}
        {tab === "invoices" && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-white">فاکتورهای صادرشده من</h2>
                <p className="text-xs text-slate-400">تمام فاکتورهای شما به صورت خودکار در پنل مدیریت و انبار ثبت و محاسبه می‌گردد.</p>
              </div>
              <button
                onClick={() => setShowInvoice(true)}
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold hover:bg-purple-500 transition flex items-center gap-1.5"
              >
                <FilePlus2 className="h-4 w-4" />
                + صدور فاکتور جدید
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300 text-right">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-3">شماره فاکتور</th>
                    <th className="p-3">تاریخ (شمسی)</th>
                    <th className="p-3">نام مشتری</th>
                    <th className="p-3">مبلغ کل فاکتور</th>
                    <th className="p-3">مانده طلب</th>
                    <th className="p-3">وضعیت تسویه</th>
                    <th className="p-3 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invoices.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono font-bold text-cyan-300">{inv.invoiceNumber}</td>
                      <td className="p-3 text-slate-400">{toJalaliDate(inv.invoiceDate || inv.createdAt)}</td>
                      <td className="p-3 font-semibold text-white">{inv.customerName}</td>
                      <td className="p-3 font-bold text-emerald-400">{formatMoney(inv.grandTotal)}</td>
                      <td className="p-3 font-semibold text-rose-400">{formatMoney(inv.balanceDue)}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === "paid"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : inv.paymentStatus === "partial"
                              ? "bg-amber-500/20 text-amber-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {inv.paymentStatus === "paid"
                            ? "تسویه کامل"
                            : inv.paymentStatus === "partial"
                            ? "پرداخت جزیی"
                            : "تسویه نشده"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() =>
                              setEditInvoice({
                                ...inv,
                                dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : "",
                              })
                            }
                            className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white"
                          >
                            توضیحات
                          </button>
                          {inv.paymentStatus !== "paid" && (
                            <button
                              onClick={() => markPaid(inv)}
                              disabled={busy}
                              className="rounded-xl bg-emerald-500/20 text-emerald-300 px-2.5 py-1 text-xs hover:bg-emerald-500/30 transition"
                            >
                              تسویه شد
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Modal: Add/Edit Customer */}
      {showCustomer && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCustomer(false);
          }}
        >
          <form
            onSubmit={saveCustomer}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-4 shadow-2xl my-8 text-xs"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                {editingCustomer ? `ویرایش اطلاعات مشتری (${editingCustomer.name})` : "تعریف پرونده مشتری جدید"}
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomer(false)}
                className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                <span>بستن</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  نام و نام خانوادگی مسئول <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  placeholder="مثال: رضا احمدی"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">نام فروشگاه / داروخانه / گالری:</label>
                <input
                  placeholder="مثال: گالری عطر نسترن"
                  value={customerForm.storeName}
                  onChange={(e) => setCustomerForm({ ...customerForm, storeName: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  شماره موبایل <span className="text-rose-400">*</span>
                </label>
                <input
                  required
                  placeholder="0912..."
                  value={customerForm.mobile}
                  onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">تلفن ثابت فروشگاه:</label>
                <input
                  placeholder="021..."
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">شهر:</label>
                <input
                  placeholder="تهران"
                  value={customerForm.city}
                  onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">پروژه مرتبط:</label>
                <select
                  value={customerForm.projectId}
                  onChange={(e) => setCustomerForm({ ...customerForm, projectId: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
                >
                  <option value="">-- بدون پروژه (عمومی) --</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">آدرس فروشگاه:</label>
              <input
                placeholder="آدرس دقیق"
                value={customerForm.address}
                onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
              />
            </div>

            {/* Interactive Map Picker (Optional) */}
            <InteractiveMapPicker
              latitude={customerForm.latitude}
              longitude={customerForm.longitude}
              onChange={({ latitude, longitude }) =>
                setCustomerForm((prev: any) => ({ ...prev, latitude, longitude }))
              }
            />

            <div>
              <label className="block text-slate-300 font-semibold mb-1">یادداشت‌ها و توضیحات:</label>
              <textarea
                rows={2}
                value={customerForm.notes}
                onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                placeholder="یادداشت‌های پیگیری..."
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCustomer(false)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:text-white"
              >
                انصراف و بستن
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-emerald-500 text-slate-950 px-6 py-2 font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition"
              >
                {busy ? "در حال ذخیره..." : "ذخیره مشتری"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: New Invoice */}
      {showInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/80 overflow-y-auto p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInvoice(false);
          }}
        >
          <form
            onSubmit={saveInvoice}
            className="max-w-3xl mx-auto rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-4 my-8 shadow-2xl text-xs"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FilePlus2 className="h-5 w-5 text-purple-400" />
                صدور فاکتور فروش میدانی
              </h3>
              <button
                type="button"
                onClick={() => setShowInvoice(false)}
                className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                <span>بستن</span>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  انتخاب مشتری <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={invoiceForm.customerId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, customerId: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
                >
                  <option value="">-- انتخاب مشتری --</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.storeName || c.mobile})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">پروژه:</label>
                <select
                  value={invoiceForm.projectId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, projectId: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
                >
                  <option value="">فروش بدون پروژه (عمومی)</option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="space-y-2 border-t border-slate-800 pt-3">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-300">کالاهای سفارش مشتری</span>
                <button
                  type="button"
                  onClick={() =>
                    setInvoiceForm((f: any) => ({
                      ...f,
                      items: [...f.items, { productId: "", quantity: 1, unitPrice: "" }],
                    }))
                  }
                  className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="h-3.5 w-3.5" />
                  + افزودن ردیف کالا
                </button>
              </div>

              {invoiceForm.items.map((it: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800"
                >
                  <select
                    required
                    value={it.productId}
                    onChange={(e) => selectProduct(i, e.target.value)}
                    className="flex-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-white"
                  >
                    <option value="">-- انتخاب محصول --</option>
                    {products.map((p: any) => (
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
                      value={it.quantity}
                      onChange={(e) => updateItem(i, "quantity", e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-white text-center font-bold"
                    />
                  </div>

                  <div className="w-32">
                    <input
                      type="number"
                      placeholder="قیمت واحد"
                      value={it.unitPrice}
                      onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-emerald-400 font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setInvoiceForm((f: any) => ({
                        ...f,
                        items: f.items.length === 1 ? f.items : f.items.filter((_: any, j: number) => j !== i),
                      }))
                    }
                    className="text-rose-400 p-1.5 hover:text-rose-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Initial Payment */}
            <div className="grid sm:grid-cols-2 gap-3 border-t border-slate-800 pt-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">مبلغ دریافتی نقدی اولیه (تومان):</label>
                <input
                  value={invoiceForm.initialPaymentAmount}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, initialPaymentAmount: e.target.value })}
                  type="number"
                  min="0"
                  placeholder="مبلغ پرداختی مشتری..."
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white font-bold text-emerald-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">حساب دریافت وجه:</label>
                <select
                  value={invoiceForm.accountId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, accountId: e.target.value })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
                >
                  <option value="">-- انتخاب حساب واریزی --</option>
                  {accounts.map((a: any) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">توضیحات فاکتور:</label>
              <textarea
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                placeholder="توضیحات فاکتور..."
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-white"
              />
            </div>

            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4 flex justify-between items-center text-sm font-bold">
              <span>مجموع کل فاکتور:</span>
              <span className="text-purple-300 text-base">{formatMoney(total)}</span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowInvoice(false)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:text-white"
              >
                انصراف و بستن
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-purple-600 px-6 py-2.5 font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
              >
                {busy ? "در حال ثبت..." : "تأیید و صدور نهایی فاکتور"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Invoice Notes */}
      {editInvoice && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditInvoice(null);
          }}
        >
          <form
            onSubmit={updateInvoice}
            className="w-full max-w-lg rounded-3xl bg-slate-950 border border-slate-800 p-6 space-y-4 shadow-2xl text-xs"
          >
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">ویرایش توضیحات فاکتور {editInvoice.invoiceNumber}</h3>
              <button
                type="button"
                onClick={() => setEditInvoice(null)}
                className="rounded-xl border border-slate-800 p-2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">یادداشت‌ها و توضیحات پیگیری:</label>
              <textarea
                value={editInvoice.notes || ""}
                onChange={(e) => setEditInvoice({ ...editInvoice, notes: e.target.value })}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-white min-h-24"
                placeholder="توضیحات..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditInvoice(null)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:text-white"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-cyan-600 px-5 py-2 font-bold text-white hover:bg-cyan-500 transition"
              >
                ذخیره تغییرات
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
