import nodemailer from "nodemailer";
import type { Request, Response } from "express";
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

export async function postQuote(request: Request, response: Response) {
  const parsed = quoteSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({ ok: false, error: "invalid_payload" });
  }

  const siteKey = process.env.HCAPTCHA_SITE_KEY ?? process.env.PUBLIC_HCAPTCHA_SITE_KEY ?? "";
  const siteSecret = process.env.HCAPTCHA_SITE_SECRET_KEY ?? "";

  if (!siteSecret) {
    return response.status(500).json({ ok: false, error: "captcha_not_configured" });
  }

  const forwardedFor = request.headers["x-forwarded-for"];
  const remoteIp =
    typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim() ?? null
      : Array.isArray(forwardedFor)
        ? forwardedFor[0]?.split(",")[0]?.trim() ?? null
        : request.ip ?? null;

  const captchaCheck = await verifyHCaptchaToken(
    parsed.data.hcaptchaToken,
    remoteIp,
    siteKey,
    siteSecret
  );
  if (!captchaCheck.success) {
    return response
      .status(400)
      .json({ ok: false, error: "captcha_invalid", details: captchaCheck.errorCodes });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPortRaw = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpPortRaw || !smtpUser || !smtpPass) {
    return response.status(500).json({ ok: false, error: "smtp_not_configured" });
  }

  const smtpPort = Number.parseInt(smtpPortRaw, 10);
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    return response.status(500).json({ ok: false, error: "smtp_port_invalid" });
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
  const subject = `NAVAI Quote Request - ${parsed.data.name}`;
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
    return response.status(500).json({ ok: false, error: "email_send_failed" });
  }

  return response.json({ ok: true });
}
