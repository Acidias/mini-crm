import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  // Check inbound emails
  const rows = await sql`SELECT id, resend_id, direction, from_address, subject,
    body_text IS NOT NULL as has_text,
    body_html IS NOT NULL as has_html,
    LENGTH(body_text) as text_len,
    LENGTH(body_html) as html_len
    FROM emails WHERE direction = 'inbound' ORDER BY created_at DESC LIMIT 5`;
  console.log("Inbound emails:");
  console.log(JSON.stringify(rows, null, 2));

  // Try fetching a received email from Resend API
  if (rows.length > 0 && rows[0].resend_id) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY!);
    console.log("\nTrying to fetch from Resend receiving API, id:", rows[0].resend_id);
    try {
      const result = await resend.emails.receiving.get(rows[0].resend_id);
      console.log("Success:", JSON.stringify({
        id: result.data?.id,
        subject: result.data?.subject,
        has_text: !!result.data?.text,
        has_html: !!result.data?.html,
        text_preview: result.data?.text?.slice(0, 200),
        html_preview: result.data?.html?.slice(0, 200),
      }, null, 2));
    } catch (err) {
      console.log("Error:", err);
    }
  }
}

main().catch(console.error);
