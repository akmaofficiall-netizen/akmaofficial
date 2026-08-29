import { NextResponse } from "next/server";
import { requirePermission } from "@/services/access";
import { restoreBackupById } from "@/services/backup";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("admin.settings");
    const { id } = await params;
    const result = await restoreBackupById(id);
    return NextResponse.json({ ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
