import { NextResponse } from "next/server";

export async function GET() {
  const siteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? process.env.HCAPTCHA_SITE_KEY ?? "";
  return NextResponse.json({ siteKey });
}
