import { NextResponse } from "next/server";
import { getBackupById } from "@/services/backup";
import { requirePermission } from "@/services/access";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("admin.settings");
    const { id } = await params;
    const backup = await getBackupById(id);

    if (!backup || !backup.backupData) {
      return NextResponse.json({ success: false, error: "نسخه پشتیبان یافت نشد." }, { status: 404 });
    }

    const jsonString = JSON.stringify(backup.backupData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${backup.filename}"`,
      },
    });
  } catch (error: any) {
    const status = error.message?.includes("دسترسی") ? 403 : 500;
    return NextResponse.json({ success: false, error: error.message }, { status });
  }
}
