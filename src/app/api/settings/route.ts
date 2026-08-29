import { NextResponse } from "next/server";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAuditEvent } from "@/services/audit";

export async function GET() {
  try {
    const [settings] = await db.select().from(systemSettings).where(eq(systemSettings.id, "main_config")).limit(1);
    return NextResponse.json({
      success: true,
      settings: settings || {
        businessName: "سازمان و کسب‌وکار حکمت آکما",
        economicCode: "",
        nationalId: "",
        registrationNumber: "",
        postalCode: "",
        companyAddress: "",
        companyPhone: "",
        taxOffice: "",
        taxRateCorporate: 25,
        vatRate: 10,
        currency: "تومان",
        aiEnabled: true,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const [updated] = await db
      .insert(systemSettings)
      .values({
        id: "main_config",
        businessName: body.businessName,
        taxNumber: body.taxNumber || body.economicCode,
        economicCode: body.economicCode || body.taxNumber,
        nationalId: body.nationalId,
        registrationNumber: body.registrationNumber,
        postalCode: body.postalCode,
        companyAddress: body.companyAddress,
        companyPhone: body.companyPhone,
        taxOffice: body.taxOffice,
        taxRateCorporate: body.taxRateCorporate !== undefined ? Number(body.taxRateCorporate) : 25,
        vatRate: body.vatRate !== undefined ? Number(body.vatRate) : 10,
        currency: body.currency || "تومان",
        healthGreenThreshold: body.healthGreenThreshold ? Number(body.healthGreenThreshold) : 75,
        healthYellowThreshold: body.healthYellowThreshold ? Number(body.healthYellowThreshold) : 50,
        openaiApiKey: body.openaiApiKey,
        openaiModel: /^gpt-/i.test(body.openaiModel || "") ? "gemini-2.5-flash" : (body.openaiModel || "gemini-2.5-flash"),
        aiEnabled: body.aiEnabled !== undefined ? body.aiEnabled : true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: systemSettings.id,
        set: {
          businessName: body.businessName,
          taxNumber: body.taxNumber || body.economicCode,
          economicCode: body.economicCode || body.taxNumber,
          nationalId: body.nationalId,
          registrationNumber: body.registrationNumber,
          postalCode: body.postalCode,
          companyAddress: body.companyAddress,
          companyPhone: body.companyPhone,
          taxOffice: body.taxOffice,
          taxRateCorporate: body.taxRateCorporate !== undefined ? Number(body.taxRateCorporate) : 25,
          vatRate: body.vatRate !== undefined ? Number(body.vatRate) : 10,
          currency: body.currency,
          healthGreenThreshold: body.healthGreenThreshold ? Number(body.healthGreenThreshold) : 75,
          healthYellowThreshold: body.healthYellowThreshold ? Number(body.healthYellowThreshold) : 50,
          openaiApiKey: body.openaiApiKey,
          openaiModel: /^gpt-/i.test(body.openaiModel || "") ? "gemini-2.5-flash" : (body.openaiModel || "gemini-2.5-flash"),
          aiEnabled: body.aiEnabled,
          updatedAt: new Date(),
        },
      })
      .returning();

    await logAuditEvent("UPDATE", "settings", "main_config", { businessName: updated.businessName });
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
