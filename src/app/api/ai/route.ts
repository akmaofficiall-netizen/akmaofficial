import { NextResponse } from "next/server";
import { requirePermission } from "@/services/access";
import { queryAIAssistant } from "@/services/ai";

export async function POST(req: Request) {
  try {
    await requirePermission("ai.view");
    const body = await req.json();

    if (!body.question) {
      return NextResponse.json({ success: false, error: "متن سوال الزامی است." }, { status: 400 });
    }

    const result = await queryAIAssistant(body.question, body.projectId);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
