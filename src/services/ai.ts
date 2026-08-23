import { getDashboardKPIs } from "./reporting";
import { getActiveAlerts } from "./alerts";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export interface AIAnalysisResult {
  facts: string[];
  calculatedMetrics: Record<string, any>;
  assumptions: string[];
  recommendations: string[];
  proposalAction?: {
    actionType: string;
    description: string;
    payload: Record<string, any>;
    requiresUserApproval: boolean;
  } | null;
}

/**
 * AI Assistant Context Builder & Decision Engine
 */
export async function queryAIAssistant(
  question: string,
  projectId?: string | null
): Promise<AIAnalysisResult> {
  // Fetch settings & system context
  const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, "main_config")).limit(1);
  const apiKey = process.env.OPENAI_API_KEY || settings?.openaiApiKey;
  const kpis = await getDashboardKPIs({ projectId });
  const activeAlerts = await getActiveAlerts(projectId);

  const facts = [
    `مبلغ کل فروش: ${kpis.totalSales.toLocaleString("fa-IR")} تومان`,
    `سود ناخالص عملیاتی: ${kpis.totalGrossProfit.toLocaleString("fa-IR")} تومان (حاشیه سود ناخالص: ${kpis.grossMarginPercent}%)`,
    `سود خالص کسب‌وکار: ${kpis.netProfit.toLocaleString("fa-IR")} تومان (حاشیه سود خالص: ${kpis.netMarginPercent}%)`,
    `مجموع مطالبات (دریافتنی): ${kpis.totalReceivable.toLocaleString("fa-IR")} تومان`,
    `موجودی نقدینگی و بانک: ${kpis.totalLiquidity.toLocaleString("fa-IR")} تومان`,
    `تعداد اعلان‌های فعال سیستم: ${activeAlerts.length} عدد`,
  ];

  const calculatedMetrics = {
    totalSales: kpis.totalSales,
    totalGrossProfit: kpis.totalGrossProfit,
    grossMarginPercent: kpis.grossMarginPercent,
    netProfit: kpis.netProfit,
    netMarginPercent: kpis.netMarginPercent,
    totalReceivable: kpis.totalReceivable,
    totalLiquidity: kpis.totalLiquidity,
    healthBreakdown: kpis.healthBreakdown,
  };

  const assumptions = [
    "تحلیل بر اساس داده‌های ثبت شده عملیاتی تا زمان حاضر انجام گرفته است.",
    "نرخ‌های بهای تمام شده بر اساس فرمول ساخت BOM و قیمت‌های خرید جار محاسبه شده‌اند.",
  ];

  // Try real OpenAI API call if key available
  if (apiKey) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: settings?.openaiModel || "gpt-4o",
          messages: [
            {
              role: "system",
              content: `شما مشاور و هوش مصنوعی سیستم مدیریت و حسابداری حکمت آکما هستید.
پاسخ را بصورت JSON معتبر با ساختار زیر بدهید:
{
  "facts": ["..."],
  "calculatedMetrics": {},
  "assumptions": ["..."],
  "recommendations": ["..."],
  "proposalAction": null
}`
            },
            {
              role: "user",
              content: `پرسش کاربر: ${question}\n\nاطلاعات سیستم:\n${facts.join("\n")}`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);
        return {
          facts: content.facts || facts,
          calculatedMetrics,
          assumptions: content.assumptions || assumptions,
          recommendations: content.recommendations || [],
          proposalAction: content.proposalAction || null,
        };
      }
    } catch (e) {
      console.warn("OpenAI API call error, fallback to internal engine:", e);
    }
  }

  // Fallback Analytical Persian Engine
  const recommendations: string[] = [];
  let proposalAction = null;

  if (kpis.totalReceivable > kpis.totalLiquidity * 1.5) {
    recommendations.push("حجم مطالبات نسبت به نقدینگی بالا است؛ پیگیری فاکتورهای سررسید گذشته پیشنهاد می‌شود.");
  }
  if (kpis.grossMarginPercent < 20) {
    recommendations.push("حاشیه سود ناخالص زیر ۲۰٪ است. بررسی قیمت خرید مواد اولیه و تعدیل قیمت فروش پیشنهاد می‌شود.");
    proposalAction = {
      actionType: "SIMULATE_INFLATION_ADJUSTMENT",
      description: "شبیه‌سازی افزایش ۱۰٪ قیمت مواد اولیه و تاثیر آن بر حاشیه سود",
      payload: { priceIncreasePercent: 10 },
      requiresUserApproval: true,
    };
  }
  if (activeAlerts.length > 0) {
    recommendations.push(`تعداد ${activeAlerts.length} اعلان نیازمند رسیدگی در مرکز هشدارها وجود دارد.`);
  }

  if (recommendations.length === 0) {
    recommendations.push("وضعیت مالی و عملیاتی سیستم متوازن است. پایش دوره ای خریدها و فروش‌ها ادامه یابد.");
  }

  return {
    facts,
    calculatedMetrics,
    assumptions,
    recommendations,
    proposalAction,
  };
}
