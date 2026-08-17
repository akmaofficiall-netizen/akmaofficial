import { NextResponse } from "next/server";
import { createFullSystemBackup, getBackupsList } from "@/services/backup";

export async function GET() {
  try {
    const list = await getBackupsList();
    return NextResponse.json({ success: true, backups: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const createdBackup = await createFullSystemBackup();
    return NextResponse.json({ success: true, backup: createdBackup });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
