"use client";

import React, { useEffect, useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { Users, Plus, UserX, RefreshCw, AlertTriangle, X } from "lucide-react";

export const EmployeesView: React.FC = () => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [offboardingEmp, setOffboardingEmp] = useState<any | null>(null);
  const [replacementEmpId, setReplacementEmpId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: "",
    name: "",
    mobile: "",
    role: "visitor",
    commissionRatePercent: 5,
    notes: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/employees").then((r) => r.json());
      if (res.success) setEmployees(res.employees || []);
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setForm({
      code: `EMP-${Math.floor(10 + Math.random() * 90)}`,
      name: "",
      mobile: "",
      role: "visitor",
      commissionRatePercent: 5,
      notes: "",
    });
    setIsAddModalOpen(true);
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.mobile) {
      alert("نام و شماره موبایل الزامی است.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json());

      if (res.success) {
        setIsAddModalOpen(false);
        fetchData();
      } else {
        alert(res.error || "خطا در ثبت همکار");
      }
    } catch (err: any) {
      alert(err.message || "خطا در سیستم");
    } finally {
      setSaving(false);
    }
  };

  const handleOffboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offboardingEmp) return;

    setSaving(true);
    try {
      const res = await fetch("/api/employees/offboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: offboardingEmp.id,
          replacementEmployeeId: replacementEmpId || null,
          transferReason,
        }),
      }).then((r) => r.json());

      if (res.success) {
        setOffboardingEmp(null);
        fetchData();
        alert(
          `انتقال مسئولیت‌ها با موفقیت انجام شد. تعداد ${res.result.transferredCustomersCount} مشتری و ${res.result.transferredTasksCount} کار به ${res.result.replacementName} منتقل گردید.`
        );
      } else {
        alert(res.error || "خطا در انتقال کارمند");
      }
    } catch (err: any) {
      alert(err.message || "خطا در ارتباط با سرور");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-purple-400" />
            مدیریت همکاران، ویزیتورها و فرآیند انتقال مسئولیت
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            تعیین پورسانت، حفظ سوابق خریدهای قبلی هنگام خروج کارمند و انتقال مسئولیت مشتریان به ویزیتور جایگزین
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          افزودن ویزیتور / همکار جدید
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((emp) => (
          <div key={emp.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono text-[10px] text-slate-400 font-bold">{emp.code}</span>
                <h3 className="text-base font-bold text-white mt-0.5">{emp.name}</h3>
                <p className="text-xs text-purple-300">نقش: {emp.role === "visitor" ? "ویزیتور فروش" : emp.role}</p>
              </div>
              <NeonBadge variant={emp.status === "active" ? "green" : "gray"}>
                {emp.status === "active" ? "فعال" : "منتقل شده / غیرفعال"}
              </NeonBadge>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p>شماره همراه: {emp.mobile}</p>
              <p>نرخ پورسانت: {emp.commissionRatePercent}%</p>
            </div>

            {emp.status === "active" && (
              <button
                onClick={() => {
                  setOffboardingEmp(emp);
                  setReplacementEmpId("");
                  setTransferReason("");
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/20 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 transition-all"
              >
                <UserX className="h-3.5 w-3.5" />
                خروج و انتقال مسئولیت مشتریان
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Offboard Modal */}
      {offboardingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserX className="h-5 w-5 text-rose-400" />
                فرآیند خروج کارمند و انتقال مسئولیت
              </h3>
              <button onClick={() => setOffboardingEmp(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
              کارمند: <span className="font-bold text-white">{offboardingEmp.name}</span>
              <br />
              <span className="text-slate-400">تمام سوابق فاکتورها، پورسانت‌ها و خریدهای قبلی مشتریان حفظ می‌گردد.</span>
            </p>

            <form onSubmit={handleOffboard} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">انتخاب ویزیتور جایگزین (جهت دریافت مشتریان)</label>
                <select
                  value={replacementEmpId}
                  onChange={(e) => setReplacementEmpId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white"
                >
                  <option value="">-- بدون ویزیتور (مشتریان بدون ویزیتور شوند) --</option>
                  {employees
                    .filter((e) => e.id !== offboardingEmp.id && e.status === "active")
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">دلیل انتقال / خروج کارمند *</label>
                <textarea
                  required
                  placeholder="علت خروج یا تغییر مسئولیت سازمانی"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white h-20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setOffboardingEmp(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-rose-600 px-5 py-2 font-semibold text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500"
                >
                  {saving ? "در حال انتقال..." : "تایید و انتقال مسئولیت‌ها"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
