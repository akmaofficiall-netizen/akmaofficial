import { NextResponse } from "next/server";
import { offboardEmployee } from "@/services/employeeOffboard";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.employeeId) {
      return NextResponse.json({ success: false, error: "شناسه کارمند الزامی است." }, { status: 400 });
    }

    const result = await offboardEmployee({
      employeeId: body.employeeId,
      replacementEmployeeId: body.replacementEmployeeId || null,
      transferReason: body.transferReason,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
