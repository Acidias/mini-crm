import { neon } from "@neondatabase/serverless";
import { Resend } from "resend";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Find inbound emails with no content
  const rows = await sql`SELECT id, resend_id FROM emails WHERE direction = 'inbound' AND resend_id IS NOT NULL AND (body_text IS NULL OR LENGTH(body_text) = 0)`;

  console.log(`Found ${rows.length} emails to backfill`);

  for (const row of rows) {
    try {
      const result = await resend.emails.receiving.get(row.resend_id);
      if (result.data) {
        const text = result.data.text || null;
        const html = result.data.html || null;
        if (text || html) {
          await sql`UPDATE emails SET body_text = ${text}, body_html = ${html} WHERE id = ${row.id}`;
          console.log(`Updated email ${row.id}: text=${text?.length || 0} chars, html=${html?.length || 0} chars`);
        } else {
          console.log(`Email ${row.id}: no content from Resend API`);
        }
      }
    } catch (err) {
      console.log(`Failed email ${row.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log("Done");
}

main().catch(console.error);
