import { NextResponse } from "next/server";
export async function POST(){const r=NextResponse.json({success:true});r.cookies.set("employee_session","",{httpOnly:true,expires:new Date(0),path:"/"});return r;}
