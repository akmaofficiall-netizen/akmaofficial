"use client";

import React, { useState } from "react";
import { NeonBadge } from "@/components/ui/NeonBadge";
import { Bot, Send, CheckCircle, RefreshCw, Sparkles, ShieldCheck } from "lucide-react";

export const AiAssistantView: React.FC<{ selectedProjectId: string | null }> = ({ selectedProjectId }) => {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, projectId: selectedProjectId }),
      }).then((r) => r.json());

      if (res.success) {
        setResult(res.result);
      } else {
        alert(res.error || "خطا در پاسخ هوش مصنوعی");
      }
    } catch (err: any) {
      alert(err.message || "خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="h-6 w-6 text-purple-400" />
            مشاور هوش مصنوعی و دستیار تحلیلی حکمت آکما
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            پاسخ‌گویی بر اساس داده‌های واقعی دیتابیس (حقایق، متریک‌ها، فرض‌ها و توصیه‌های عملیاتی)
          </p>
        </div>
        <NeonBadge variant="purple" pulse>
          هوش مصنوعی زنده
        </NeonBadge>
      </div>

      {/* Query Input */}
      <form onSubmit={handleAsk} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex gap-3 shadow-xl">
        <input
          type="text"
          placeholder="مثلاً: وضعیت سودآوری ماه جاری چگونه است و چه راهکاری برای افزایش حاشیه سود پیشنهاد می‌کنی؟"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all shrink-0"
        >
          {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          تحلیل و پرسش
        </button>
      </form>

      {/* Result Output */}
      {result && (
        <div className="rounded-2xl border border-purple-500/30 bg-slate-900/80 p-6 shadow-2xl space-y-6 text-xs">
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-2">
            <h3 className="font-bold text-cyan-300 text-sm">پاسخ مستقیم هوش مصنوعی</h3>
            <p className="text-slate-200 leading-7 whitespace-pre-wrap">{result.answer}</p>
          </div>
          {/* Operational Facts */}
          <div className="space-y-2">
            <h3 className="font-bold text-purple-300 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              حقایق عملیاتی دیتابیس (Operational Facts):
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
              {result.facts?.map((f: string, idx: number) => (
                <li key={idx}>{f}</li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="space-y-2 border-t border-slate-800 pt-4">
            <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              توصیه‌ها و تحلیل مشاور:
            </h3>
            <div className="space-y-2">
              {result.recommendations?.map((r: string, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                  {r}
                </div>
              ))}
            </div>
          </div>

          {/* Proposal Action if available */}
          {result.proposalAction && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-2">
              <span className="font-bold text-amber-300 text-xs">پیشنهاد اقدام عملیاتی هوش مصنوعی (نیازمند تایید کاربر):</span>
              <p className="text-slate-300">{result.proposalAction.description}</p>
              <button
                onClick={() => alert("اقدام هوش مصنوعی با موفقیت اعمال گردید.")}
                className="mt-2 rounded-xl bg-amber-600 px-4 py-2 font-bold text-white shadow hover:bg-amber-500"
              >
                تایید و اجرای اقدام سیستم
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
