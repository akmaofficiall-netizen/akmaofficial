import { NextResponse } from "next/server";
import { getBackupsList, createSystemBackup } from "@/services/backup";
import { requirePermission } from "@/services/access";

export async function GET() {
  try {
    await requirePermission("admin.settings");
    const backups = await getBackupsList();
    return NextResponse.json({ success: true, backups });
  } catch (error: any) {
    const status = error.message?.includes("دسترسی") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}

export async function POST() {
  try {
    const context = await requirePermission("admin.settings");
    const backup = await createSystemBackup(
      context?.employeeId || "system_user",
      context?.roleCode || "مدیر سیستم"
    );
    return NextResponse.json({ success: true, backup });
  } catch (error: any) {
    const status = error.message?.includes("دسترسی") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
