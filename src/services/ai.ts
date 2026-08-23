import { getDashboardKPIs } from "./reporting";
import { getActiveAlerts } from "./alerts";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProjectDashboard } from "@/services/partner";

export interface AIAnalysisResult {
  answer: string;
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

let cachedGeminiModels: { apiKey: string; models: string[]; expiresAt: number } | null = null;

const PREFERRED_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
];

function normalizeModelId(name?: string | null, baseModelId?: string | null): string | null {
  const raw = baseModelId || name || null;
  if (!raw) return null;
  return raw.startsWith("models/") ? raw.slice("models/".length) : raw;
}

function modelScore(modelId: string): number {
  const exact = PREFERRED_GEMINI_MODELS.indexOf(modelId);
  if (exact >= 0) return 1000 - exact * 50;
  const lower = modelId.toLowerCase();
  if (/flash/i.test(lower)) {
    let score = 500;
    if (/lite/i.test(lower)) score += 25;
    if (/\b3\./.test(lower)) score += 10;
    if (/preview|experimental|exp/i.test(lower)) score -= 40;
    return score;
  }
  return 0;
}

async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  if (cachedGeminiModels && cachedGeminiModels.apiKey === apiKey && cachedGeminiModels.expiresAt > Date.now()) {
    return cachedGeminiModels.models;
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
    {
      method: "GET",
      headers: { "x-goog-api-key": apiKey },
      cache: "no-store",
    }
  );

  const bodyText = await response.text().catch(() => "");
  if (!response.ok) {
    let detail = bodyText;
    try {
      const parsed = JSON.parse(bodyText);
      detail = parsed?.error?.message || bodyText;
    } catch {
      // Keep raw response when Gemini does not return JSON.
    }
    throw new Error(`Gemini models discovery failed (${response.status}): ${detail}`);
  }

  let data: any;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error("Gemini مدل‌های در دسترس را با پاسخ JSON معتبر برنگرداند.");
  }

  const models = Array.isArray(data?.models) ? data.models : [];
  const usable = models
    .filter((m: any) => {
      const actions = [
        ...(Array.isArray(m?.supportedActions) ? m.supportedActions : []),
        ...(Array.isArray(m?.supportedGenerationMethods) ? m.supportedGenerationMethods : []),
      ].map((v: unknown) => String(v).toLowerCase());
      return actions.includes("generatecontent");
    })
    .map((m: any) => normalizeModelId(m?.name, m?.baseModelId))
    .filter((id: string | null): id is string => !!id)
    .filter((id: string) => !/(embedding|vision|live|image|audio|tts|robotics|transcribe)/i.test(id));

  const uniqueSorted: string[] = Array.from(new Set<string>(usable)).sort(
    (a: string, b: string) => modelScore(b) - modelScore(a) || a.localeCompare(b)
  );

  if (!uniqueSorted.length) {
    throw new Error("هیچ مدل Gemini قابل استفاده برای generateContent با این API Key پیدا نشد.");
  }

  cachedGeminiModels = {
    apiKey,
    models: uniqueSorted,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  return uniqueSorted;
}

function shouldRetryWithAnotherGeminiModel(status: number, detail: string): boolean {
  const normalized = detail.toLowerCase();
  if ([429, 500, 502, 503, 504].includes(status)) return true;
  if (status === 400) {
    return /(high demand|overload|overloaded|temporar|unavailable|not found|unsupported|responsemimetype|response mime|resource exhausted|rate limit)/i.test(normalized);
  }
  return /(high demand|overload|overloaded|temporar|unavailable|resource exhausted|rate limit)/i.test(normalized);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGeminiJson(text: string): Record<string, any> {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Gemini پاسخ JSON معتبری برنگرداند.");
  }
  return parsed as Record<string, any>;
}

/**
 * AI Assistant Context Builder & Gemini Decision Engine.
 *
 * The existing database field names openaiApiKey/openaiModel are intentionally
 * kept for backward compatibility with existing databases and settings APIs.
 * The legacy model column is kept only for database/API compatibility; the AI service never trusts or selects a model from Settings.
 */
export async function queryAIAssistant(
  question: string,
  projectId?: string | null
): Promise<AIAnalysisResult> {
  const [settings] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.id, "main_config"))
    .limit(1);

  const apiKey = process.env.GEMINI_API_KEY || settings?.openaiApiKey;
  const kpis = await getDashboardKPIs({ projectId });
  const activeAlerts = await getActiveAlerts(projectId);
  const projectContext = projectId ? await getProjectDashboard(projectId) : null;

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
    "نرخ‌های بهای تمام شده بر اساس فرمول ساخت BOM و قیمت‌های خرید جاری محاسبه شده‌اند.",
  ];

  if (!apiKey) {
    throw new Error("کلید Gemini تنظیم نشده است. مقدار GEMINI_API_KEY را در Environment Variables سرور یا تنظیمات هوش مصنوعی وارد کنید.");
  }

  const systemInstruction = `شما مشاور هوشمند سیستم مدیریت و حسابداری «حکمت آکما» هستید.
وظیفه شما پاسخ دقیق، کاربردی و فارسی به سوال واقعی کاربر بر اساس داده‌های عملیاتی ارائه‌شده است.
هر سوال را جداگانه تحلیل کن و هرگز پاسخ ثابت یا قالبی را صرفاً به این دلیل که داده‌های KPI مشابه هستند تکرار نکن.
فقط از اطلاعات ارائه‌شده به عنوان واقعیت استفاده کن؛ اگر داده کافی برای نتیجه‌گیری وجود ندارد، صریحاً بگو چه چیزی کم است.
هیچ عددی را بدون مبنا اختراع نکن.
پیشنهادها باید مستقیماً به سوال کاربر مربوط باشند.
پاسخ را فقط در قالب JSON معتبر برگردان و فیلد answer را همیشه با یک پاسخ آزاد و طبیعی به خود سؤال پر کن؛ حتی اگر سؤال خارج از KPIهای کسب‌وکار است، راهنمایی عمومی و مفید بده و هر جا داده واقعی سیستم لازم است صریحاً کمبود آن را بیان کن.
proposalAction فقط وقتی ساخته شود که یک اقدام مشخص و قابل انجام از روی داده‌های موجود پیشنهاد می‌کنی؛ در غیر این صورت null باشد.`;

  const alertContext = activeAlerts.slice(0, 20).map((alert: any) => ({
    title: alert.title,
    severity: alert.severity,
    type: alert.type,
    message: alert.message,
    createdAt: alert.createdAt,
  }));

  const userPrompt = `پرسش کاربر:
${question.trim()}

داده‌های واقعی فعلی سیستم:
${facts.join("\n")}

شاخص‌های عددی:
${JSON.stringify(calculatedMetrics)}

اطلاعات پروژه جاری (در صورت انتخاب پروژه):
${JSON.stringify(projectContext)}

هشدارهای فعال (${activeAlerts.length} مورد، حداکثر ۲۰ مورد اول):
${JSON.stringify(alertContext)}

فرض‌های پایه:
${assumptions.join("\n")}`;

  const candidateModels = await discoverGeminiModels(apiKey);
  let lastError = "";

  for (let index = 0; index < candidateModels.length; index += 1) {
    const model = candidateModels[index];
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.find(
        (part: { text?: string }) => typeof part.text === "string"
      )?.text;

      if (!text) {
        throw new Error(`Gemini با مدل ${model} پاسخ متنی معتبری برنگرداند.`);
      }

      const content = parseGeminiJson(text);

      return {
        answer: typeof content.answer === "string" ? content.answer : "پاسخ قابل اتکایی برای این پرسش تولید نشد.",
        facts: Array.isArray(content.facts) ? content.facts : facts,
        calculatedMetrics,
        assumptions: Array.isArray(content.assumptions) ? content.assumptions : assumptions,
        recommendations: Array.isArray(content.recommendations) ? content.recommendations : [],
        proposalAction:
          content.proposalAction && typeof content.proposalAction === "object"
            ? content.proposalAction
            : null,
      };
    }

    const errorBody = await response.text().catch(() => "");
    let detail = errorBody;
    try {
      const parsed = JSON.parse(errorBody);
      detail = parsed?.error?.message || errorBody;
    } catch {
      // Keep raw response when Gemini does not return JSON.
    }

    lastError = `مدل ${model} (${response.status}): ${detail}`;
    console.warn("Gemini model request failed:", lastError);

    if (!shouldRetryWithAnotherGeminiModel(response.status, detail) || index === candidateModels.length - 1) {
      break;
    }

    // Give transient capacity/rate-limit failures a brief pause before trying the next model.
    await sleep(Math.min(1500, 250 * (index + 1)));
  }

  // Force fresh model discovery after transient failures so the next request does not keep a stale list.
  cachedGeminiModels = null;
  throw new Error(`هیچ‌کدام از مدل‌های قابل‌استفاده Gemini پاسخ ندادند. آخرین خطا: ${lastError}`);

}
