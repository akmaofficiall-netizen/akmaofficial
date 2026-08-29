import { NextResponse } from "next/server";
import { getBackupById } from "@/services/backup";
import { requirePermission } from "@/services/access";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await requirePermission("backup.view"); const { id } = await params; const backup = await getBackupById(id); if (!backup) return NextResponse.json({success:false,error:"پشتیبان پیدا نشد"},{status:404}); const json = JSON.stringify(backup.backupData ?? {}, null, 2); return new Response(json,{status:200,headers:{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="${backup.filename}"`}}); }
  catch(e:any){ return NextResponse.json({success:false,error:e.message},{status:500}); }
}
