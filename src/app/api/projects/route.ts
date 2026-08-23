import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { logAuditEvent } from "@/services/audit";

export async function GET() {
  try {
    const list = await db.select().from(projects).orderBy(desc(projects.createdAt));
    return NextResponse.json({ success: true, projects: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name || !body.code) {
      return NextResponse.json({ success: false, error: "کد و نام پروژه الزامی است." }, { status: 400 });
    }

    const [created] = await db
      .insert(projects)
      .values({
        code: body.code,
        name: body.name,
        label: body.label || null,
        description: body.description || null,
        color: body.color || "#3b82f6",
        icon: body.icon || "folder",
        status: body.status || "active",
      })
      .returning();

    await logAuditEvent("CREATE", "project", created.id, { code: created.code, name: created.name });
    return NextResponse.json({ success: true, project: created });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
