import nodemailer from "nodemailer";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { LUXISOFT_QUOTE_EMAIL } from "@/lib/luxisoft-contact";

const quoteSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  company: z.string().trim().optional().default(""),
  whatsapp: z.string().trim().optional().default(""),
  message: z.string().trim().min(1),
  language: z.string().trim().optional().default("es"),
  hcaptchaToken: z.string().trim().min(1),
  hcaptchaEkey: z.string().trim().optional(),
});

function getBooleanEnv(value: string | undefined, fallback = false) {
  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

async function verifyHCaptchaToken(
  token: string,
  remoteIp: string | null,
  siteKey: string,
  siteSecret: string
) {
  const formBody = new URLSearchParams();
  formBody.set("secret", siteSecret);
  formBody.set("response", token);
  if (remoteIp) {
    formBody.set("remoteip", remoteIp);
  }
  if (siteKey) {
    formBody.set("sitekey", siteKey);
  }

  const response = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formBody,
    cache: "no-store",
  });

  if (!response.ok) {
    return { success: false, errorCodes: ["captcha_service_unavailable"] as string[] };
  }

  const data = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
  return {
    success: Boolean(data.success),
    errorCodes: data["error-codes"] ?? [],
  };
}

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = quoteSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const siteKey = process.env.HCAPTCHA_SITE_KEY ?? process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY ?? "";
  const siteSecret = process.env.HCAPTCHA_SITE_SECRET_KEY ?? "";

  if (!siteSecret) {
    return NextResponse.json({ ok: false, error: "captcha_not_configured" }, { status: 500 });
  }

  const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const captchaCheck = await verifyHCaptchaToken(parsed.data.hcaptchaToken, remoteIp, siteKey, siteSecret);

  if (!captchaCheck.success) {
    return NextResponse.json(
      { ok: false, error: "captcha_invalid", details: captchaCheck.errorCodes },
      { status: 400 }
    );
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPortRaw = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPortRaw || !smtpUser || !smtpPass) {
    return NextResponse.json({ ok: false, error: "smtp_not_configured" }, { status: 500 });
  }

  const smtpPort = Number.parseInt(smtpPortRaw, 10);
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    return NextResponse.json({ ok: false, error: "smtp_port_invalid" }, { status: 500 });
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: getBooleanEnv(process.env.SMTP_SECURE, smtpPort === 465),
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const fromEmail = process.env.SMTP_FROM ?? smtpUser;
  const subject = `Navai Quote Request - ${parsed.data.name}`;
  const text = [
    "New implementation quote request",
    "",
    `Name: ${parsed.data.name}`,
    `Email: ${parsed.data.email}`,
    `WhatsApp: ${parsed.data.whatsapp || "-"}`,
    `Company: ${parsed.data.company || "-"}`,
    `Language: ${parsed.data.language}`,
    "",
    "Message:",
    parsed.data.message,
    "",
    `hCaptcha ekey: ${parsed.data.hcaptchaEkey || "-"}`,
  ].join("\n");

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: LUXISOFT_QUOTE_EMAIL,
      replyTo: parsed.data.email,
      subject,
      text,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "email_send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
