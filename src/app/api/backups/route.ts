import { NextResponse } from "next/server";
import { createFullSystemBackup, getBackupsList } from "@/services/backup";
import { requirePermission } from "@/services/access";

export async function GET() {
  try {
    await requirePermission("backup.view");
    const list = await getBackupsList();
    return NextResponse.json({ success: true, backups: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requirePermission("backup.create");
    const createdBackup = await createFullSystemBackup();
    return NextResponse.json({ success: true, backup: createdBackup });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
