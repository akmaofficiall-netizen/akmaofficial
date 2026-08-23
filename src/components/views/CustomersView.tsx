"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import {
  Users,
  User,
  Plus,
  Edit2,
  MapPin,
  Activity,
  Phone,
  Search,
  RefreshCw,
  X,
  FileText,
  DollarSign
} from "lucide-react";

export const CustomersView: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [viewingProfile, setViewingProfile] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    name: "",
    storeName: "",
    mobile: "",
    phone: "",
    email: "",
    address: "",
    city: "تهران",
    latitude: 35.6892,
    longitude: 51.3890,
    assignedEmployeeId: "",
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, empRes] = await Promise.all([
        fetch("/api/customers").then((r) => r.json()),
        fetch("/api/employees").then((r) => r.json()),
      ]);

      if (custRes.success) setCustomers(custRes.customers || []);
      if (empRes.success) setEmployees(empRes.employees || []);
    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setFormData({
      code: `CUST-${Math.floor(1000 + Math.random() * 9000)}`,
      name: "",
      storeName: "",
      mobile: "",
      phone: "",
      email: "",
      address: "",
      city: "تهران",
      latitude: 35.6892,
      longitude: 51.3890,
      assignedEmployeeId: employees[0]?.id || "",
      notes: "",
    });
    setIsAddModalOpen(true);
  };

  const openProfileDrawer = async (cust: any) => {
    try {
      const res = await fetch(`/api/customers/${cust.id}`).then((r) => r.json());
      if (res.success) {
        setViewingProfile(res);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) {
      alert("نام مشتری و شماره موبایل الزامی است.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }).then((r) => r.json());

      if (res.success) {
        setIsAddModalOpen(false);
        fetchData();
      } else {
        alert(res.error || "خطا در ثبت مشتری");
      }
    } catch (err: any) {
      alert(err.message || "خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.storeName && c.storeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.mobile.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-400" />
            مدیریت مشتریان و پرونده CRM
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            ارزیابی خودکار امتیاز سلامت مشتری (۰ تا ۱۰۰)، تاریخچه خریدهای قبلی و ویزیتور مسئول
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          ثبت مشتری جدید
        </button>
      </div>

      {/* Filter */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام، فروشگاه یا شماره موبایل مشتری..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-9 pl-4 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl transition-all hover:border-purple-500/40 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-bold">{c.code}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{c.name}</h3>
                {c.storeName && <p className="text-xs text-purple-300 font-medium">{c.storeName}</p>}
              </div>
              <NeonBadge variant={c.healthStatus} pulse={c.healthStatus === "red"}>
                امتیاز {c.healthScore}
              </NeonBadge>
            </div>

            <div className="space-y-1.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                <span>{c.mobile}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                <span className="truncate">{c.address || c.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>ویزیتور: {c.assignedEmployeeName}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => openProfileDrawer(c)}
                className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:underline"
              >
                <Activity className="h-3.5 w-3.5" />
                مشاهده پرونده و پرونده مالی
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-400" />
                افزودن مشتری جدید
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">نام کامل مشتری *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">نام فروشگاه / شرکت</label>
                  <input
                    type="text"
                    value={formData.storeName}
                    onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">شماره همراه *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">شهر</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">آدرس کامل دقیق</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">عرض جغرافیایی (Latitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">طول جغرافیایی (Longitude)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ویزیتور مسئول</label>
                <select
                  value={formData.assignedEmployeeId}
                  onChange={(e) => setFormData({ ...formData, assignedEmployeeId: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                >
                  <option value="">-- بدون ویزیتور --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
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
                  className="rounded-xl bg-purple-600 px-5 py-2 font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500"
                >
                  {saving ? "در حال ثبت..." : "ذخیره مشتری"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Drawer */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
          <div className="h-full w-full max-w-lg bg-slate-900 border-r border-slate-800 p-6 shadow-2xl overflow-y-auto space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{viewingProfile.customer.name}</h3>
                <p className="text-slate-400 mt-0.5">{viewingProfile.customer.storeName || viewingProfile.customer.mobile}</p>
              </div>
              <button onClick={() => setViewingProfile(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3 border border-slate-800">
              <span className="text-slate-300 font-semibold">امتیاز سلامت CRM:</span>
              <NeonBadge variant={viewingProfile.customer.healthStatus}>
                {viewingProfile.customer.healthScore} / ۱۰۰ ({viewingProfile.customer.healthStatus === "green" ? "سالم" : viewingProfile.customer.healthStatus === "yellow" ? "هشدار" : "قرمز"})
              </NeonBadge>
            </div>

            {/* Invoices History */}
            <div className="space-y-2">
              <h4 className="font-bold text-white text-sm">سوابق فاکتورهای خریدار</h4>
              {viewingProfile.invoices.length > 0 ? (
                viewingProfile.invoices.map((inv: any) => (
                  <div key={inv.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-white">#{inv.invoiceNumber}</p>
                      <p className="text-[10px] text-slate-500">{new Date(inv.invoiceDate).toLocaleDateString("fa-IR")}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-400">{Number(inv.grandTotal).toLocaleString("fa-IR")} تومان</p>
                      <p className="text-[10px] text-slate-400">طلب: {Number(inv.balanceDue).toLocaleString("fa-IR")}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-center py-4">هیچ فاکتوری برای این مشتری ثبت نشده است.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
