import { NextResponse } from "next/server";
import { requirePermission } from "@/services/access";
import { restoreFullSystemBackup } from "@/services/backup";

export async function POST(req: Request) {
  try {
    await requirePermission("admin.settings");
    const contentType = req.headers.get("content-type") || "";
    let dumpData: any = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "فایل پشتیبان انتخاب نشده است." }, { status: 400 });
      }
      const text = await file.text();
      dumpData = JSON.parse(text);
    } else {
      const body = await req.json();
      dumpData = body.dump || body;
    }

    const result = await restoreFullSystemBackup(dumpData);
    return NextResponse.json({ ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
