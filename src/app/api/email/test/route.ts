import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { sendSmtpEmail, getFromAddress } from "@/lib/email";

export async function GET(req: NextRequest) {
  const isAuthed = await authenticateRequest(req);
  if (!isAuthed) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const to = req.nextUrl.searchParams.get("to");

  // If no "to" param, just test the config without sending
  if (!to) {
    return NextResponse.json({
      config: {
        smtp_host: process.env.SMTP_HOST || "not set",
        smtp_port: process.env.SMTP_PORT || "not set",
        smtp_user: process.env.SMTP_USER ? `${process.env.SMTP_USER.slice(0, 5)}...` : "not set",
        smtp_pass: process.env.SMTP_PASS ? "set (hidden)" : "not set",
        from: getFromAddress(),
      },
    });
  }

  // Send a test email
  try {
    const { messageId } = await sendSmtpEmail({
      to,
      subject: "Mini CRM - Test Email",
      text: "This is a test email from Mini CRM via Zoho SMTP.",
    });
    return NextResponse.json({ success: true, messageId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ error: message, stack }, { status: 500 });
  }
}
