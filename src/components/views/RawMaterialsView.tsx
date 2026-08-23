"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import {
  Package,
  Plus,
  Edit2,
  History,
  AlertTriangle,
  RefreshCw,
  Search,
  DollarSign,
  Layers,
  CheckCircle,
  X,
  Sliders,
  TrendingUp,
  FileText
} from "lucide-react";

export const RawMaterialsView: React.FC = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Modals & Drawers state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMaterial, setEditMaterial] = useState<any | null>(null);
  const [adjustingMaterial, setAdjustMaterial] = useState<any | null>(null);
  const [viewingHistoryMaterial, setViewingHistory] = useState<any | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [supplierModal, setSupplierModal] = useState<any | null>(null);
  const [supplierForm, setSupplierForm] = useState({ code:"", name:"", contactPerson:"", mobile:"", phone:"", email:"", address:"", city:"تهران", notes:"" });

  // Form fields for Add/Edit
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    unit: "کیلوگرم",
    unitConversionFactor: 1,
    secondaryUnit: "",
    stockQuantity: 0,
    minStockQuantity: 10,
    currentCost: 0,
    supplierId: "",
    costPolicy: "average",
    notes: "",
    priceChangeReason: "",
  });

  // Adjustment fields
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rmRes, supRes] = await Promise.all([
        fetch("/api/raw-materials").then((r) => r.json()),
        fetch("/api/suppliers").then((r) => r.json()),
      ]);

      if (rmRes.success) setMaterials(rmRes.rawMaterials || []);
      if (supRes.success) setSuppliers(supRes.suppliers || []);
    } catch (err) {
      console.error("Error fetching raw materials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openSupplierModal = (supplier:any=null) => { setSupplierModal(supplier); setSupplierForm({ code:supplier?.code || `SUP-${Math.floor(100+Math.random()*900)}`, name:supplier?.name||"", contactPerson:supplier?.contactPerson||"", mobile:supplier?.mobile||"", phone:supplier?.phone||"", email:supplier?.email||"", address:supplier?.address||"", city:supplier?.city||"تهران", notes:supplier?.notes||"" }); };
  const saveSupplier = async (e:React.FormEvent) => { e.preventDefault(); setSaving(true); try { const res=await fetch(supplierModal?.id?`/api/suppliers/${supplierModal.id}`:"/api/suppliers",{method:supplierModal?.id?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(supplierForm)}).then(r=>r.json()); if(!res.success) throw new Error(res.error||"خطا در ذخیره تامین‌کننده"); setSupplierModal(null); fetchData(); } catch(e:any){ setErrorMessage(e.message); } finally{ setSaving(false); } };

  const openAddModal = () => {
    setFormData({
      code: `RM-${Math.floor(100 + Math.random() * 900)}`,
      name: "",
      unit: "کیلوگرم",
      unitConversionFactor: 1,
      secondaryUnit: "",
      stockQuantity: 0,
      minStockQuantity: 10,
      currentCost: 0,
      supplierId: suppliers[0]?.id || "",
      costPolicy: "average",
      notes: "",
      priceChangeReason: "",
    });
    setErrorMessage(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (rm: any) => {
    setEditMaterial(rm);
    setFormData({
      code: rm.code,
      name: rm.name,
      unit: rm.unit,
      unitConversionFactor: rm.unitConversionFactor || 1,
      secondaryUnit: rm.secondaryUnit || "",
      stockQuantity: rm.stockQuantity,
      minStockQuantity: rm.minStockQuantity,
      currentCost: rm.currentCost,
      supplierId: rm.supplierId || "",
      costPolicy: rm.costPolicy || "average",
      notes: rm.notes || "",
      priceChangeReason: "",
    });
    setErrorMessage(null);
  };

  const openHistoryDrawer = async (rm: any) => {
    setViewingHistory(rm);
    try {
      const res = await fetch(`/api/raw-materials/${rm.id}`).then((r) => r.json());
      if (res.success) {
        setPriceHistory(res.priceHistory || []);
      }
    } catch (err) {
      console.error("Failed to load price history:", err);
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code || formData.currentCost <= 0) {
      setErrorMessage("لطفاً تمامی فیلدهای اجباری (کد، نام و قیمت خرید) را تکمیل نمایید.");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/raw-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }).then((r) => r.json());

      if (res.success) {
        setIsAddModalOpen(false);
        fetchData();
      } else {
        setErrorMessage(res.error || "خطا در ثبت ماده اولیه");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "خطای ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/raw-materials/${editingMaterial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      }).then((r) => r.json());

      if (res.success) {
        setEditMaterial(null);
        fetchData();
      } else {
        setErrorMessage(res.error || "خطا در به روزرسانی ماده اولیه");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "خطای ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingMaterial) return;

    setSaving(true);
    try {
      const res = await fetch("/api/raw-materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "adjust_stock",
          rawMaterialId: adjustingMaterial.id,
          newQuantity: adjustQty,
          reason: adjustReason || "تعدیل دستی انبار",
        }),
      }).then((r) => r.json());

      if (res.success) {
        setAdjustMaterial(null);
        fetchData();
      } else {
        alert(res.error || "خطا در تعدیل موجودی");
      }
    } catch (err: any) {
      alert(err.message || "خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  const filteredMaterials = materials.filter((rm) => {
    const matchesSearch =
      rm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rm.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLow = filterLowStock ? rm.isLowStock : true;
    return matchesSearch && matchesLow;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-400" />
            مدیریت کامل مواد اولیه و قطعات
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تعریف مواد اولیه، فرمول قیمت‌گذاری، تاریخچه تغییر قیمت، اثر بر بهای تمام شده BOM و تعدیلات انبار
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            افزودن ماده اولیه جدید
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
        <div className="flex items-center justify-between"><div><h3 className="font-bold text-white">مدیریت تأمین‌کنندگان</h3><p className="text-[11px] text-slate-500 mt-1">ثبت و ویرایش اطلاعات تأمین‌کنندگان برای خرید و مواد اولیه</p></div><button onClick={()=>openSupplierModal()} className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-bold text-white">+ افزودن تأمین‌کننده</button></div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">{suppliers.map(s=><div key={s.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 flex items-center justify-between"><div><b className="text-sm text-white">{s.name}</b><div className="text-[10px] text-slate-500 mt-1">{s.mobile} · {s.city||"-"}</div></div><button onClick={()=>openSupplierModal(s)} className="rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-cyan-300">ویرایش</button></div>)}</div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام یا کد ماده اولیه..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2 pr-9 pl-4 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
              filterLowStock
                ? "border-amber-500 bg-amber-500/10 text-amber-300"
                : "border-slate-700 bg-slate-950 text-slate-400 hover:text-white"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            فقط مواد اولیه دارای کمبود
          </button>

          <button
            onClick={fetchData}
            className="rounded-xl border border-slate-700 bg-slate-950 p-2 text-slate-400 hover:text-white transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">کد</th>
                <th className="p-4">نام ماده اولیه</th>
                <th className="p-4">واحد سنجش</th>
                <th className="p-4">موجودی فعلی</th>
                <th className="p-4">قیمت خرید جاری</th>
                <th className="p-4">میانگین موزون قیمت</th>
                <th className="p-4">تامین‌کننده</th>
                <th className="p-4">وضعیت</th>
                <th className="p-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMaterials.length > 0 ? (
                filteredMaterials.map((rm) => (
                  <tr key={rm.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="p-4 font-mono font-bold text-slate-400">{rm.code}</td>
                    <td className="p-4 font-semibold text-white">
                      {rm.name}
                      {rm.notes && <p className="text-[10px] text-slate-500 font-normal">{rm.notes}</p>}
                    </td>
                    <td className="p-4 text-slate-300">{rm.unit}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${rm.isLowStock ? "text-amber-400" : "text-slate-200"}`}>
                          {rm.stockQuantity.toLocaleString("fa-IR")}
                        </span>
                        {rm.isLowStock && (
                          <NeonBadge variant="yellow" size="sm" pulse>
                            کمبود
                          </NeonBadge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-emerald-400">
                      {rm.currentCost.toLocaleString("fa-IR")} <span className="text-[10px] text-slate-500">تومان</span>
                    </td>
                    <td className="p-4 font-semibold text-sky-300">
                      {rm.averageCost.toLocaleString("fa-IR")} <span className="text-[10px] text-slate-500">تومان</span>
                    </td>
                    <td className="p-4 text-slate-400">{rm.supplierName}</td>
                    <td className="p-4">
                      <NeonBadge variant={rm.status === "active" ? "green" : "gray"}>
                        {rm.status === "active" ? "فعال" : "غیرفعال"}
                      </NeonBadge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(rm)}
                          title="ویرایش کامل ماده اولیه"
                          className="rounded-lg bg-blue-500/10 p-1.5 text-blue-400 hover:bg-blue-500/20 transition-all"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setAdjustMaterial(rm);
                            setAdjustQty(rm.stockQuantity);
                            setAdjustReason("");
                          }}
                          title="تعدیل دستی موجودی"
                          className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openHistoryDrawer(rm)}
                          title="تاریخچه تغییرات قیمت"
                          className="rounded-lg bg-purple-500/10 p-1.5 text-purple-400 hover:bg-purple-500/20 transition-all"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    ماده اولیه متناظر با فیلتر یافت نشد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-400" />
                تعریف ماده اولیه جدید
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">کد ماده اولیه *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">نام ماده اولیه *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثلاً: پروفیل آلومینیوم خام"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">واحد اصلی *</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  >
                    <option value="کیلوگرم">کیلوگرم</option>
                    <option value="مترمربع">مترمربع</option>
                    <option value="عدد">عدد</option>
                    <option value="بسته">بسته</option>
                    <option value="کارتن">کارتن</option>

                    <option value="لیتر">لیتر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">قیمت خرید جاری (تومان) *</label>
                  <input
                    type="number"
                    required
                    value={formData.currentCost}
                    onChange={(e) => setFormData({ ...formData, currentCost: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-semibold text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">موجودی اولیه</label>
                  <input
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">حداقل حد مجاز سفارش</label>
                  <input
                    type="number"
                    value={formData.minStockQuantity}
                    onChange={(e) => setFormData({ ...formData, minStockQuantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">تامین‌کننده اصلی</label>
                <select
                  value={formData.supplierId}
                  onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                >
                  <option value="">-- بدون تعیین --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
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
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
                >
                  {saving ? "در حال ثبت..." : "ذخیره ماده اولیه"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-400" />
                ویرایش ماده اولیه: {editingMaterial.name}
              </h3>
              <button onClick={() => setEditMaterial(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">کد ماده اولیه</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">نام ماده اولیه</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">قیمت خرید جاری (تومان)</label>
                  <input
                    type="number"
                    required
                    value={formData.currentCost}
                    onChange={(e) => setFormData({ ...formData, currentCost: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-semibold text-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">علت تغییر قیمت (جهت ثبت در تاریخچه)</label>
                  <input
                    type="text"
                    placeholder="مثلاً: تورم تولید یا فاکتور خرید جدید"
                    value={formData.priceChangeReason}
                    onChange={(e) => setFormData({ ...formData, priceChangeReason: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">واحد اصلی</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">حداقل حد مجاز سفارش</label>
                  <input
                    type="number"
                    value={formData.minStockQuantity}
                    onChange={(e) => setFormData({ ...formData, minStockQuantity: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditMaterial(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
                >
                  {saving ? "در حال به‌روزرسانی..." : "ذخیره تغییرات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-emerald-400" />
                تعدیل دستی موجودی انبار
              </h3>
              <button onClick={() => setAdjustMaterial(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              ماده اولیه: <span className="font-bold text-white">{adjustingMaterial.name}</span> | موجودی فعلی:{" "}
              <span className="font-bold text-emerald-400">{adjustingMaterial.stockQuantity} {adjustingMaterial.unit}</span>
            </p>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">موجودی جدید شمارش شده انبار *</label>
                <input
                  type="number"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">دلیل تعدیل موجودی *</label>
                <textarea
                  required
                  placeholder="مثلاً: انبارگردانی پایان دوره، ضایعات یا انحراف شمارش"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustMaterial(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-emerald-600 px-5 py-2 font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500"
                >
                  {saving ? "در حال ثبت..." : "تایید و ثبت تعدیل"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {viewingHistoryMaterial && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="h-full w-full max-w-md bg-slate-900 border-r border-slate-800 p-6 shadow-2xl overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-purple-400" />
                تاریخچه تغییرات قیمت
              </h3>
              <button onClick={() => setViewingHistory(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              سوابق قیمت و انحراف نرخ برای: <span className="font-bold text-white">{viewingHistoryMaterial.name}</span>
            </p>

            <div className="space-y-3">
              {priceHistory.length > 0 ? (
                priceHistory.map((ph) => (
                  <div key={ph.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>{new Date(ph.createdAt).toLocaleDateString("fa-IR")}</span>
                      <span className="font-semibold text-purple-400">{ph.reason}</span>
                    </div>
                    <div className="flex justify-between items-center font-semibold pt-1">
                      <span className="text-slate-500 line-through">{Number(ph.oldCost).toLocaleString("fa-IR")} تومان</span>
                      <span className="text-emerald-400">{Number(ph.newCost).toLocaleString("fa-IR")} تومان</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">هیچ تغییر قیمتی برای این ماده ثبت نشده است.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {supplierModal && <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"><form onSubmit={saveSupplier} className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-4"><div className="flex justify-between"><h3 className="font-bold">{supplierModal?.id?"ویرایش تأمین‌کننده":"تأمین‌کننده جدید"}</h3><button type="button" onClick={()=>setSupplierModal(null)}><X className="h-5 w-5"/></button></div><div className="grid md:grid-cols-2 gap-3">{[["code","کد"],["name","نام"],["contactPerson","مسئول"],["mobile","موبایل"],["phone","تلفن"],["email","ایمیل"],["city","شهر"],["address","آدرس"]].map(([k,l])=><input key={k} required={k==="name"||k==="mobile"} placeholder={l} value={(supplierForm as any)[k]} onChange={e=>setSupplierForm({...supplierForm,[k]:e.target.value})} className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-white"/>)}</div><textarea value={supplierForm.notes} onChange={e=>setSupplierForm({...supplierForm,notes:e.target.value})} placeholder="یادداشت" className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-white"/><div className="flex justify-end gap-2"><button type="button" onClick={()=>setSupplierModal(null)} className="rounded-xl border border-slate-700 px-4 py-2">انصراف</button><button disabled={saving} className="rounded-xl bg-cyan-600 px-4 py-2 font-bold">ذخیره</button></div></form></div>}

    </div>
  );
};
