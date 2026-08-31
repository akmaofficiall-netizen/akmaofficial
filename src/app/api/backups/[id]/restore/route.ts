import { NextResponse } from "next/server";
import { getBackupById, restoreBackupPayload } from "@/services/backup";
import { requirePermission } from "@/services/access";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const context = await requirePermission("admin.settings");
    const { id } = await params;
    const backup = await getBackupById(id);

    if (!backup || !backup.backupData) {
      return NextResponse.json({ success: false, error: "نسخه پشتیبان مورد نظر یافت نشد." }, { status: 404 });
    }

    const restoredStats = await restoreBackupPayload(
      backup.backupData,
      context?.employeeId || "system_user",
      context?.roleCode || "مدیر سیستم"
    );

    return NextResponse.json({ success: true, restoredStats });
  } catch (error: any) {
    const status = error.message?.includes("دسترسی") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
