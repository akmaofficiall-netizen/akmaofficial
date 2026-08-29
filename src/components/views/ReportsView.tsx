"use client";

import React, { useEffect, useState, useRef } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import {
  TrendingUp,
  BarChart2,
  DollarSign,
  Sliders,
  Layers,
  RefreshCw,
  ArrowUpRight,
  ShoppingBag,
  Users,
  Calendar,
  Package,
  FileText,
  Download,
  Printer,
  Building,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Eye
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { toJalaliDate, formatMoney, formatMoneyDual, formatNumber } from "@/lib/dateUtils";
import { numberToPersianWords } from "@/lib/numberToWords";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const ReportsView: React.FC<{ selectedProjectId: string | null }> = ({ selectedProjectId }) => {
  const [activeTab, setActiveTab] = useState<"financial" | "tax_declaration" | "sales" | "inflation" | "comparison">("financial");
  const [financialData, setFinancialData] = useState<any>(null);
  const [salesData, setSalesData] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tax Declaration state
  const [taxData, setTaxData] = useState<any>(null);
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxPreset, setTaxPreset] = useState("year1403");
  const [taxStartDate, setTaxStartDate] = useState("2024-03-20");
  const [taxEndDate, setTaxEndDate] = useState("2025-03-20");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const taxDocRef = useRef<HTMLDivElement>(null);
  const [docTrackingNumber] = useState(() => `TX-${Math.floor(10000000 + Math.random() * 90000000)}`);
  const [docCreationDate] = useState(() => toJalaliDate(new Date()));

  // Inflation simulator state
  const [simulatedChanges, setSimulatedChanges] = useState<{ [key: string]: number }>({});
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [simResults, setSimResults] = useState<any[]>([]);

  // Comparison State
  const [projA, setProjA] = useState("");
  const [projB, setProjB] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const projParam = selectedProjectId ? `&projectId=${selectedProjectId}` : "";
      const [finRes, salesRes, projRes, rmRes] = await Promise.all([
        fetch(`/api/reports?type=financial${projParam}`).then((r) => r.json()),
        fetch(`/api/reports?type=sales${projParam}`).then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
        fetch("/api/raw-materials").then((r) => r.json()),
      ]);

      if (finRes.success) setFinancialData(finRes.data);
      if (salesRes.success) setSalesData(salesRes.data);
      if (projRes.success) {
        setProjects(projRes.projects || []);
        if (projRes.projects.length >= 2) {
          setProjA(projRes.projects[0].id);
          setProjB(projRes.projects[1].id);
        }
      }
      if (rmRes.success) setRawMaterials(rmRes.rawMaterials || []);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxDeclaration = async (start = taxStartDate, end = taxEndDate) => {
    setTaxLoading(true);
    try {
      const projParam = selectedProjectId ? `&projectId=${selectedProjectId}` : "";
      const query = `/api/reports?type=tax_declaration&startDate=${start}&endDate=${end}${projParam}`;
      const res = await fetch(query).then((r) => r.json());
      if (res.success) {
        setTaxData(res.data);
      }
    } catch (err) {
      console.error("Error fetching tax declaration:", err);
    } finally {
      setTaxLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchTaxDeclaration();
  }, [selectedProjectId]);

  const handlePresetChange = (preset: string) => {
    setTaxPreset(preset);
    let s = "2024-03-20",
      e = "2025-03-20";
    if (preset === "year1403") {
      s = "2024-03-20";
      e = "2025-03-20";
    } else if (preset === "spring1403") {
      s = "2024-03-20";
      e = "2024-06-21";
    } else if (preset === "summer1403") {
      s = "2024-06-21";
      e = "2024-09-21";
    } else if (preset === "autumn1403") {
      s = "2024-09-22";
      e = "2024-12-21";
    } else if (preset === "winter1403") {
      s = "2024-12-22";
      e = "2025-03-20";
    } else if (preset === "year1404") {
      s = "2025-03-21";
      e = "2026-03-20";
    }
    setTaxStartDate(s);
    setTaxEndDate(e);
    fetchTaxDeclaration(s, e);
  };

  const handleDownloadTaxPdf = async () => {
    if (!taxDocRef.current) return;
    setGeneratingPdf(true);
    try {
      const element = taxDocRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      const filename = `Tax_Declaration_${taxStartDate}_to_${taxEndDate}.pdf`;
      pdf.save(filename);
    } catch (err: any) {
      alert("خطا در تولید فایل PDF: " + err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrintTaxDoc = () => {
    if (!taxDocRef.current) return;
    const printContent = taxDocRef.current.innerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
        <head>
          <meta charset="utf-8" />
          <title>اظهارنامه مالیاتی رسمی</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { size: A4 portrait; margin: 8mm; }
            }
            body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #000; }
          </style>
        </head>
        <body class="p-4 bg-white text-black">
          ${printContent}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRunInflationSim = async () => {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate_inflation", changes: simulatedChanges }),
      }).then((r) => r.json());

      if (res.success) {
        setSimResults(res.simulation || []);
      }
    } catch (err) {
      console.error("Simulation error:", err);
    }
  };

  const handleRunComparison = async () => {
    if (!projA || !projB) return;
    try {
      const res = await fetch(`/api/reports?type=project_comparison&projectAId=${projA}&projectBId=${projB}`).then((r) =>
        r.json()
      );
      if (res.success) {
        setComparisonData(res.data);
      }
    } catch (err) {
      console.error("Comparison error:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const kpis = financialData?.kpis || {};
  const waterfallData = financialData?.waterfallData || [];

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-purple-400" />
            مرکز گزارشات مدیریتی، سود و زیان (P&L) و اظهارنامه مالیاتی
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            داده‌های عملیاتی یکپارچه از فروش ویزیتوری، انبارداری، حساب‌ها و اظهارنامه مالیاتی رسمی
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-slate-900 p-1.5 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("financial")}
            className={`rounded-xl px-3.5 py-2 transition ${
              activeTab === "financial" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            سود و زیان (P&L)
          </button>
          <button
            onClick={() => setActiveTab("tax_declaration")}
            className={`rounded-xl px-3.5 py-2 transition flex items-center gap-1.5 ${
              activeTab === "tax_declaration" ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            اظهارنامه مالیاتی (PDF)
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`rounded-xl px-3.5 py-2 transition ${
              activeTab === "sales" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            فروش و همکاران
          </button>
          <button
            onClick={() => setActiveTab("inflation")}
            className={`rounded-xl px-3.5 py-2 transition ${
              activeTab === "inflation" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            شبیه‌ساز تورم
          </button>
          <button
            onClick={() => setActiveTab("comparison")}
            className={`rounded-xl px-3.5 py-2 transition ${
              activeTab === "comparison" ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30" : "text-slate-400 hover:text-white"
            }`}
          >
            مقایسه پروژه‌ها
          </button>
        </div>
      </div>

      {/* Tab: Tax Declaration (اظهارنامه مالیاتی رسمی) */}
      {activeTab === "tax_declaration" && (
        <div className="space-y-6">
          {/* Controls & Date Filter Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileSpreadsheet className="h-5 w-5 text-amber-400" />
                تنظیم دوره و بازه زمانی شمسی برای صدور اظهارنامه مالیاتی
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintTaxDoc}
                  disabled={taxLoading || !taxData}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition cursor-pointer disabled:opacity-50"
                >
                  <Printer className="h-4 w-4 text-slate-400" />
                  چاپ اظهارنامه
                </button>
                <button
                  onClick={handleDownloadTaxPdf}
                  disabled={taxLoading || generatingPdf || !taxData}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-amber-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {generatingPdf ? "در حال تولید PDF..." : "دانلود PDF اظهارنامه مالیاتی"}
                </button>
              </div>
            </div>

            {/* Presets & Custom Dates */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 ml-1">دوره‌های پیش‌فرض:</span>
                {[
                  { id: "year1403", label: "کل سال مالی ۱۴۰۳" },
                  { id: "spring1403", label: "فصل بهار ۱۴۰۳" },
                  { id: "summer1403", label: "فصل تابستان ۱۴۰۳" },
                  { id: "autumn1403", label: "فصل پاییز ۱۴۰۳" },
                  { id: "winter1403", label: "فصل زمستان ۱۴۰۳" },
                  { id: "year1404", label: "سال مالی ۱۴۰۴" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePresetChange(p.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs transition ${
                      taxPreset === p.id
                        ? "bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">از تاریخ (آغاز دوره مالیاتی):</label>
                  <input
                    type="date"
                    value={taxStartDate}
                    onChange={(e) => {
                      setTaxPreset("custom");
                      setTaxStartDate(e.target.value);
                    }}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">معادل شمسی: {toJalaliDate(taxStartDate)}</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">تا تاریخ (پایان دوره مالیاتی):</label>
                  <input
                    type="date"
                    value={taxEndDate}
                    onChange={(e) => {
                      setTaxPreset("custom");
                      setTaxEndDate(e.target.value);
                    }}
                    className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">معادل شمسی: {toJalaliDate(taxEndDate)}</span>
                </div>

                <div>
                  <button
                    onClick={() => fetchTaxDeclaration(taxStartDate, taxEndDate)}
                    disabled={taxLoading}
                    className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 py-2 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 ${taxLoading ? "animate-spin text-amber-400" : ""}`} />
                    محاسبه و دریافت اظهارنامه
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tax Declaration Document Preview Container */}
          {taxLoading ? (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : !taxData ? (
            <div className="p-8 text-center text-xs text-slate-500 border border-slate-800 rounded-2xl">
              اطلاعاتی برای نمایش یافت نشد.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 overflow-x-auto">
              {/* PRINTABLE TAX DECLARATION PAPER (A4 Layout) */}
              <div
                ref={taxDocRef}
                className="mx-auto w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 shadow-2xl rounded-sm text-right font-sans border border-slate-300"
                style={{ direction: "rtl", color: "#0f172a" }}
              >
                {/* Official Government Header */}
                <div className="border-b-2 border-slate-900 pb-4 mb-5">
                  <div className="flex items-center justify-between">
                    <div className="text-right space-y-1 text-[11px] text-slate-700">
                      <div>شماره پرونده / پیگیری: <span className="font-mono font-bold text-slate-900">{docTrackingNumber}</span></div>
                      <div>تاریخ تنظیم: <span className="font-bold text-slate-900">{docCreationDate}</span></div>
                      <div>دوره مالیاتی: <span className="font-bold text-slate-900">{toJalaliDate(taxStartDate)} الی {toJalaliDate(taxEndDate)}</span></div>
                    </div>

                    <div className="text-center space-y-1">
                      <div className="font-serif text-xs font-bold text-slate-800">جمهوری اسلامی ایران</div>
                      <div className="text-sm font-black tracking-tight text-slate-950">سازمان امور مالیاتی کشور</div>
                      <div className="text-xs font-extrabold bg-slate-100 border border-slate-300 px-3 py-1 rounded">
                        برگ اظهارنامه مالیات بر عملکرد و ارزش افزوده
                      </div>
                    </div>

                    <div className="text-left space-y-1 text-[11px] text-slate-700">
                      <div>اداره کل امور مالیاتی:</div>
                      <div className="font-bold text-slate-900">{taxData.taxpayer?.taxOffice || "اداره امور مالیاتی استان"}</div>
                      <div className="text-[10px] text-slate-500 font-mono">INTA-FORM-110/4</div>
                    </div>
                  </div>
                </div>

                {/* Section 1: Taxpayer Profile */}
                <div className="mb-5 border border-slate-800 rounded">
                  <div className="bg-slate-200 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-800">
                    بخش اول: مشخصات هویتی، قانونی و ثبتی مؤدی مالیاتی
                  </div>
                  <div className="p-3 grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-slate-600">نام شرکت / مؤدی: </span>
                      <b className="text-slate-900">{taxData.taxpayer?.businessName}</b>
                    </div>
                    <div>
                      <span className="text-slate-600">شناسه ملی: </span>
                      <b className="font-mono text-slate-900">{taxData.taxpayer?.nationalId || "-"}</b>
                    </div>
                    <div>
                      <span className="text-slate-600">کد اقتصادی: </span>
                      <b className="font-mono text-slate-900">{taxData.taxpayer?.economicCode || "-"}</b>
                    </div>

                    <div>
                      <span className="text-slate-600">شماره ثبت: </span>
                      <b className="font-mono text-slate-900">{taxData.taxpayer?.registrationNumber || "-"}</b>
                    </div>
                    <div>
                      <span className="text-slate-600">کد پستی ۱۰ رقمی: </span>
                      <b className="font-mono text-slate-900">{taxData.taxpayer?.postalCode || "-"}</b>
                    </div>
                    <div>
                      <span className="text-slate-600">تلفن تماس: </span>
                      <b className="font-mono text-slate-900">{taxData.taxpayer?.companyPhone || "-"}</b>
                    </div>

                    <div className="col-span-3 pt-1 border-t border-slate-200">
                      <span className="text-slate-600">نشانی اقامتگاه قانونی / دفتر مرکزی: </span>
                      <b className="text-slate-900">{taxData.taxpayer?.companyAddress || "-"}</b>
                    </div>
                  </div>
                </div>

                {/* Section 2: Sales & Revenue Table */}
                <div className="mb-5 border border-slate-800 rounded">
                  <div className="bg-slate-200 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-800 flex justify-between">
                    <span>بخش دوم: جدول محاسبه فروش ناخالص، تخفیفات و درآمد خالص ابرازی</span>
                    <span className="text-[11px] font-normal">مبالغ به تومان</span>
                  </div>
                  <table className="w-full text-xs text-right border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 w-12 font-bold text-slate-700 bg-slate-50 border-l border-slate-200">۱</td>
                        <td className="p-2 text-slate-800">مجموع فروش ناخالص کالا و خدمات ({taxData.statement?.invoiceCount} فقره فاکتور)</td>
                        <td className="p-2 text-left font-mono font-bold text-slate-900">{formatMoney(taxData.statement?.grossSales || 0)}</td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <td className="p-2 font-bold text-slate-700 bg-slate-50 border-l border-slate-200">۲</td>
                        <td className="p-2 text-slate-800">تخفیفات، برگشت از فروش و تعدیلات نرخ</td>
                        <td className="p-2 text-left font-mono text-slate-700">{formatMoney(taxData.statement?.totalDiscounts || 0)}</td>
                      </tr>
                      <tr className="border-b border-slate-300 bg-slate-100 font-bold">
                        <td className="p-2 text-slate-900 bg-slate-200 border-l border-slate-300">۳</td>
                        <td className="p-2 text-slate-950">فروش خالص و درآمدهای عملیاتی دوره (ردیف ۱ منهای ردیف ۲)</td>
                        <td className="p-2 text-left font-mono text-slate-950">{formatMoney(taxData.statement?.netSalesRevenue || 0)}</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 font-bold text-slate-700 bg-slate-50 border-l border-slate-200">۴</td>
                        <td className="p-2 text-slate-800">بهای تمام شده کالای فروش رفته (COGS - مواد، تدارکات و تولید)</td>
                        <td className="p-2 text-left font-mono text-slate-800">{formatMoney(taxData.statement?.totalCogs || 0)}</td>
                      </tr>
                      <tr className="bg-slate-200/80 font-black">
                        <td className="p-2 text-slate-950 bg-slate-300 border-l border-slate-300">۵</td>
                        <td className="p-2 text-slate-950">سود (زیان) ناخالص فعالیت تجاری (ردیف ۳ منهای ردیف ۴)</td>
                        <td className="p-2 text-left font-mono text-slate-950">{formatMoney(taxData.statement?.grossProfit || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 3: Operating Expenses Breakdown */}
                <div className="mb-5 border border-slate-800 rounded">
                  <div className="bg-slate-200 px-3 py-1 font-bold text-xs text-slate-900 border-b border-slate-800 flex justify-between">
                    <span>بخش سوم: جدول هزینه‌های عملیاتی و اداری قابل قبول مالیاتی (ماده ۱۴۷ و ۱۴۸ ق.م.م)</span>
                    <span className="text-[11px] font-normal">مبالغ به تومان</span>
                  </div>
                  <table className="w-full text-xs text-right border-collapse">
                    <tbody className="divide-y divide-slate-200">
                      {taxData.expenseBreakdown && taxData.expenseBreakdown.length > 0 ? (
                        taxData.expenseBreakdown.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 w-12 font-mono text-slate-600 bg-slate-50 border-l border-slate-200">{idx + 6}</td>
                            <td className="p-2 text-slate-800">هزینه‌های: {item.category}</td>
                            <td className="p-2 text-left font-mono font-medium text-slate-900">{formatMoney(item.amount)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="p-2 w-12 font-mono text-slate-600 bg-slate-50 border-l border-slate-200">۶</td>
                          <td className="p-2 text-slate-800">هزینه‌های اداری، عمومی و لجستیک</td>
                          <td className="p-2 text-left font-mono font-medium text-slate-900">{formatMoney(taxData.statement?.totalExpenses || 0)}</td>
                        </tr>
                      )}
                      <tr className="bg-slate-50">
                        <td className="p-2 font-mono text-slate-600 bg-slate-100 border-l border-slate-200">پ</td>
                        <td className="p-2 text-slate-800">حقوق، دستمزد، بازاریابی و پورسانت‌های پرداختی به عوامل فروش</td>
                        <td className="p-2 text-left font-mono font-medium text-slate-900">{formatMoney(taxData.statement?.totalCommissions || 0)}</td>
                      </tr>
                      <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                        <td className="p-2 text-slate-900 bg-slate-200 border-l border-slate-300">جمع</td>
                        <td className="p-2 text-slate-950">جمع کل هزینه‌های عملیاتی قابل قبول دوره</td>
                        <td className="p-2 text-left font-mono text-slate-950">{formatMoney(taxData.statement?.totalAllowableDeductions || 0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 4: Tax Assessment & Net Profit */}
                <div className="mb-5 border-2 border-slate-900 rounded overflow-hidden">
                  <div className="bg-slate-900 text-white px-3 py-1.5 font-bold text-xs flex justify-between">
                    <span>بخش چهارم: محاسبه سود ویژه، مالیات بر عملکرد و مالیات بر ارزش افزوده (VAT)</span>
                    <span className="text-[11px] font-normal text-slate-300">محاسبات قطعی تشخیصی/ابرازی</span>
                  </div>
                  <table className="w-full text-xs text-right border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 text-slate-800 font-medium">سود (زیان) ویژه قبل از کسر مالیات (سود ناخالص منهای هزینه‌های عملیاتی)</td>
                        <td className="p-2 text-left font-mono font-bold text-slate-950 text-sm">
                          {formatMoney(taxData.statement?.taxableOperatingProfit || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <td className="p-2 text-slate-800">
                          مالیات بر درآمد عملکرد دوره (نرخ مصوب ماده ۱۰۵ ق.م.م: <b className="font-mono">{taxData.statement?.corporateTaxRate}%</b>)
                        </td>
                        <td className="p-2 text-left font-mono font-bold text-slate-900">
                          {formatMoney(taxData.statement?.corporateTaxAmount || 0)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 text-slate-800">
                          مالیات و عوارض بر ارزش افزوده ابرازی فروش (VAT با نرخ <b className="font-mono">{taxData.statement?.vatRate}%</b>)
                        </td>
                        <td className="p-2 text-left font-mono font-bold text-slate-900">
                          {formatMoney(taxData.statement?.calculatedVat || 0)}
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-extrabold border-t-2 border-slate-400">
                        <td className="p-2.5 text-slate-950 text-xs">سود خالص ویژه دوره مالیاتی پس از کسر تعهدات مالیاتی</td>
                        <td className="p-2.5 text-left font-mono text-slate-950 text-sm">
                          {formatMoney(taxData.statement?.netRetainedProfit || 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="bg-slate-50 p-2.5 text-[11px] border-t border-slate-200 text-slate-700">
                    مبلغ مالیات عملکرد ابرازی به حروف:{" "}
                    <b className="text-slate-900 font-bold">{numberToPersianWords(taxData.statement?.corporateTaxAmount || 0, "تومان")}</b>
                  </div>
                </div>

                {/* Section 5: Signature & Official Seal */}
                <div className="border border-slate-800 rounded p-4 text-xs space-y-4">
                  <p className="text-justify text-[11px] text-slate-700 leading-relaxed">
                    اینجانب / صاحبان امضای مجاز شرکت با آگاهی کامل از مقررات و احکام قانونی مواد قانونی مالیات‌های مستقیم و قانون مالیات بر ارزش افزوده، صحت و اصالت تمامی ارقام، فاکتورها، بهای تمام شده و اسناد مندرج در این اظهارنامه را مورد تأیید و تصدیق قطعی قرار می‌دهیم.
                  </p>

                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="text-center space-y-12">
                      <div className="font-bold text-slate-900">مهر و امضای مدیر مالی / حسابدار رسمی</div>
                      <div className="text-[10px] text-slate-400">امضاء و اثر انگشت</div>
                    </div>
                    <div className="text-center space-y-12">
                      <div className="font-bold text-slate-900">مهر رسمی شرکت و امضای مدیرعامل</div>
                      <div className="text-[10px] text-slate-400">محل مهر و امضای مجاز تعهدآور</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 1: Financial P&L Waterfall */}
      {activeTab === "financial" && (
        <div className="space-y-6">
          {/* Quick Tax Declaration Action Card */}
          <div className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-slate-900/90 p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <FileSpreadsheet className="h-4 w-4" />
                  </span>
                  <h3 className="text-base font-bold text-white">مرکز صدور و دانلود اظهارنامه مالیاتی رسمی</h3>
                  <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30">
                    قانون مالیات‌های مستقیم و VAT
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  تولید و دانلود گزارش رسمی استاندارد مالیاتی شامل درآمد فروش، بهای تمام‌شده، هزینه‌های عملیاتی، مالیات بر درآمد عملکرد (۲۵٪) و ارزش افزوده (۱۰٪).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleDownloadTaxPdf}
                  disabled={taxLoading || generatingPdf || !taxData}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {generatingPdf ? "در حال تهیه PDF..." : "دانلود فوری PDF اظهارنامه مالیاتی"}
                </button>
                <button
                  onClick={handlePrintTaxDoc}
                  disabled={taxLoading || !taxData}
                  className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3.5 py-2.5 text-xs font-bold text-slate-200 transition cursor-pointer disabled:opacity-50"
                >
                  <Printer className="h-4 w-4 text-slate-400" />
                  چاپ اظهارنامه
                </button>
                <button
                  onClick={() => setActiveTab("tax_declaration")}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-amber-950/30 hover:bg-amber-900/40 px-3.5 py-2.5 text-xs font-bold text-amber-300 transition cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                  مشاهده برگه کامل و تنظیم تاریخ
                </button>
              </div>
            </div>

            {taxData?.statement && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800/80 text-xs">
                <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">فروش مشمول دوره:</span>
                  <b className="text-white font-mono text-sm mt-0.5 block">{formatMoney(taxData.statement.netOperatingRevenue || 0)}</b>
                </div>
                <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800">
                  <span className="text-slate-400 block text-[11px]">هزینه‌های قابل قبول مالیاتی:</span>
                  <b className="text-white font-mono text-sm mt-0.5 block">{formatMoney(taxData.statement.totalAllowableDeductions || 0)}</b>
                </div>
                <div className="rounded-xl bg-amber-950/30 p-3 border border-amber-800/40">
                  <span className="text-amber-300 block text-[11px]">مالیات بر عملکرد (۲۵٪):</span>
                  <b className="text-amber-400 font-mono text-sm mt-0.5 block">{formatMoney(taxData.statement.corporateTaxAmount || 0)}</b>
                </div>
                <div className="rounded-xl bg-amber-950/30 p-3 border border-amber-800/40">
                  <span className="text-amber-300 block text-[11px]">مالیات بر ارزش افزوده (VAT ۱۰٪):</span>
                  <b className="text-amber-400 font-mono text-sm mt-0.5 block">{formatMoney(taxData.statement.calculatedVat || 0)}</b>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">درآمد ناخالص فروش:</span>
              <h3 className="text-2xl font-bold text-blue-400 font-mono">
                {formatMoney(kpis.netRevenue || 0)}
              </h3>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">سود ناخالص (Gross Profit):</span>
              <h3 className={`text-2xl font-bold font-mono ${kpis.grossProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {formatMoney(kpis.grossProfit || 0)}
              </h3>
              <p className="text-xs text-slate-400">حاشیه سود ناخالص: {kpis.grossMarginPercent || 0}%</p>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl space-y-1">
              <span className="text-xs text-slate-400">سود خالص عملیاتی (Net Profit):</span>
              <h3 className={`text-2xl font-bold font-mono ${kpis.netProfit >= 0 ? "text-purple-300" : "text-rose-400"}`}>
                {formatMoney(kpis.netProfit || 0)}
              </h3>
              <p className="text-xs text-slate-400">حاشیه سود خالص: {kpis.netMarginPercent || 0}%</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-4">نمودار ساختار سود و زیان (Waterfall Bridge)</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 20, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="step" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px" }}
                  />
                  <Bar dataKey="value" name="مبلغ (تومان)" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sales & Employees */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
              <span className="text-xs text-slate-400">کل فاکتورهای فروش ثبت‌شده:</span>
              <h3 className="text-2xl font-bold text-cyan-400 font-mono">
                {salesData?.invoiceCount || 0} عدد
              </h3>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
              <span className="text-xs text-slate-400">مجموع فروش ویزیتوری:</span>
              <h3 className="text-2xl font-bold text-emerald-400 font-mono">
                {formatMoney(salesData?.visitorSalesTotal || 0)}
              </h3>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5 space-y-1">
              <span className="text-xs text-slate-400">پورسانت‌های تعلق‌گرفته:</span>
              <h3 className="text-2xl font-bold text-purple-300 font-mono">
                {formatMoney(salesData?.commissionTotal || 0)}
              </h3>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              عملکرد فروش و پورسانت همکاران و ویزیتورها
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">نام همکار</th>
                    <th className="p-3.5">سمت</th>
                    <th className="p-3.5">تعداد فاکتورها</th>
                    <th className="p-3.5">مجموع فروش (تومان)</th>
                    <th className="p-3.5">پورسانت کل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(salesData?.employeePerformances || []).map((emp: any) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-bold text-white">{emp.employeeName}</td>
                      <td className="p-3.5 text-slate-400">{emp.role || "ویزیتور"}</td>
                      <td className="p-3.5 font-mono">{emp.invoiceCount || 0}</td>
                      <td className="p-3.5 font-bold text-emerald-400 font-mono">{formatMoney(emp.totalSales)}</td>
                      <td className="p-3.5 font-bold text-purple-300 font-mono">{formatMoney(emp.totalCommission)}</td>
                    </tr>
                  ))}
                  {!(salesData?.employeePerformances || []).length && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">
                        داده‌ای از فروش همکاران ثبت نشده است.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Inflation Simulator */}
      {activeTab === "inflation" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-amber-400" />
              سناریوسازی تغییر قیمت مواد اولیه و تورم داخلی (What-If Analysis)
            </h3>
            <p className="text-xs text-slate-400">
              بدون تغییر داده‌های واقعی دیتابیس، درصد گرانی مواد اولیه را وارد کرده و اثر آن را بر بهای تمام شده، حاشیه سود و قیمت فروش پیشنهادی بررسی نمایید.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {rawMaterials.map((rm) => (
                <div key={rm.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-3.5 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{rm.name}</span>
                    <span className="text-slate-400">{formatMoney(rm.currentCost)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">درصد افزایش:</span>
                    <input
                      type="number"
                      placeholder="0%"
                      value={simulatedChanges[rm.id] || ""}
                      onChange={(e) =>
                        setSimulatedChanges({ ...simulatedChanges, [rm.id]: Number(e.target.value) })
                      }
                      className="w-20 rounded-xl border border-slate-800 bg-slate-900 p-1.5 text-center font-bold text-amber-400"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleRunInflationSim}
              className="rounded-xl bg-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 transition"
            >
              محاسبه اثر تورم بر بهای تمام شده و پیشنهاد قیمت
            </button>
          </div>

          {/* Results */}
          {simResults.length > 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden p-6 space-y-4">
              <h4 className="text-sm font-bold text-white">نتایج شبیه‌سازی قیمت محصولات</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">نام محصول</th>
                      <th className="p-3.5">قیمت فروش فعلی</th>
                      <th className="p-3.5">بهای تمام‌شده فعلی</th>
                      <th className="p-3.5">بهای تمام‌شده جدید</th>
                      <th className="p-3.5">افت حاشیه سود</th>
                      <th className="p-3.5">قیمت فروش پیشنهادی جدید</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {simResults.map((r) => (
                      <tr key={r.productId} className="hover:bg-slate-800/40">
                        <td className="p-3.5 font-bold text-white">{r.productName}</td>
                        <td className="p-3.5 text-slate-300 font-mono">{formatMoney(r.currentPrice)}</td>
                        <td className="p-3.5 text-slate-400 font-mono">{formatMoney(r.oldCogs)}</td>
                        <td className="p-3.5 font-bold text-amber-400 font-mono">{formatMoney(r.newCogs)}</td>
                        <td className="p-3.5 font-bold text-rose-400 font-mono">-{r.marginCompressionPct}%</td>
                        <td className="p-3.5 font-bold text-emerald-400 font-mono">{formatMoney(r.recommendedPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Project Comparison */}
      {activeTab === "comparison" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              مقایسه شاخص‌های کلیدی پروژه A با پروژه B
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">انتخاب پروژه اول (A):</label>
                <select
                  value={projA}
                  onChange={(e) => setProjA(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">انتخاب پروژه دوم (B):</label>
                <select
                  value={projB}
                  onChange={(e) => setProjB(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-white"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleRunComparison}
              className="rounded-xl bg-purple-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
            >
              اجرای جدول مقایسه پروژه‌ها
            </button>
          </div>

          {comparisonData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Proj A */}
              <div className="rounded-3xl border border-blue-500/30 bg-slate-900/60 p-6 shadow-xl space-y-3">
                <NeonBadge variant="blue">{comparisonData.projectA?.info?.name || "پروژه A"}</NeonBadge>
                <p className="text-slate-300">
                  فروش کل: <b className="text-white font-mono">{formatMoney(comparisonData.projectA?.kpis?.totalSales || 0)}</b>
                </p>
                <p className="text-emerald-400 font-bold">
                  سود ناخالص: <span className="font-mono">{formatMoney(comparisonData.projectA?.kpis?.totalGrossProfit || 0)}</span>
                </p>
                <p className="text-slate-400">
                  تعداد فاکتورها: <b className="text-slate-200 font-mono">{comparisonData.projectA?.kpis?.invoiceCount || 0}</b>
                </p>
              </div>

              {/* Proj B */}
              <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/60 p-6 shadow-xl space-y-3">
                <NeonBadge variant="green">{comparisonData.projectB?.info?.name || "پروژه B"}</NeonBadge>
                <p className="text-slate-300">
                  فروش کل: <b className="text-white font-mono">{formatMoney(comparisonData.projectB?.kpis?.totalSales || 0)}</b>
                </p>
                <p className="text-emerald-400 font-bold">
                  سود ناخالص: <span className="font-mono">{formatMoney(comparisonData.projectB?.kpis?.totalGrossProfit || 0)}</span>
                </p>
                <p className="text-slate-400">
                  تعداد فاکتورها: <b className="text-slate-200 font-mono">{comparisonData.projectB?.kpis?.invoiceCount || 0}</b>
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

