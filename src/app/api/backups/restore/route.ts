import { NextResponse } from "next/server";
import { restoreBackupPayload } from "@/services/backup";
import { requirePermission } from "@/services/access";

export async function POST(req: Request) {
  try {
    const context = await requirePermission("admin.settings");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "هیچ فایلی ارسال نشده است." }, { status: 400 });
    }

    const textContent = await file.text();
    let parsedData: any;
    try {
      parsedData = JSON.parse(textContent);
    } catch {
      return NextResponse.json({ success: false, error: "فایل ارسالی فرمت معتبر JSON ندارد." }, { status: 400 });
    }

    const restoredStats = await restoreBackupPayload(
      parsedData,
      context?.employeeId || "system_user",
      context?.roleCode || "مدیر سیستم"
    );

    return NextResponse.json({ success: true, restoredStats });
  } catch (error: any) {
    const status = error.message?.includes("دسترسی") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
