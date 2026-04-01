import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { desc } from "drizzle-orm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { deleteApiKey } from "@/actions/api-keys";
import { getSettings, saveSettings } from "@/actions/settings";
import ConfirmDelete from "@/components/confirm-delete";
import ApiKeyCreate from "./api-key-create";

export const dynamic = "force-dynamic";

function timeAgo(date: Date | null): string {
  if (!date) return "Never";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const keys = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  const s = await getSettings(["email_signature", "company_description", "ai_tone"]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Profile &amp; Settings</h1>

      {/* Account info */}
      <div className="bg-card-bg rounded-xl border border-border p-5 mb-6">
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted">Account</h2>
        <div className="flex items-center gap-4">
          {session.user.image && (
            <img
              src={session.user.image}
              alt=""
              className="w-12 h-12 rounded-full"
            />
          )}
          <div>
            <p className="font-medium">{session.user.name || "User"}</p>
            <p className="text-muted text-sm">{session.user.email}</p>
          </div>
        </div>
      </div>

      {/* Email & AI Settings */}
      <form action={saveSettings} className="bg-card-bg rounded-xl border border-border p-5 mb-6 space-y-5">
        <div>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted mb-1">Email &amp; AI Settings</h2>
          <p className="text-muted text-xs mb-4">These settings are used when composing emails and by the AI assistant.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Email Signature</label>
          <p className="text-muted text-xs mb-1.5">Appended to all outgoing emails and drafts.</p>
          <textarea
            name="email_signature"
            rows={4}
            defaultValue={s.email_signature}
            placeholder={"Best regards,\nYour Name\nYour Company\n+44 123 456 7890"}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Company Description</label>
          <p className="text-muted text-xs mb-1.5">Tells the AI what your company does so it can write relevant emails and research.</p>
          <textarea
            name="company_description"
            rows={4}
            defaultValue={s.company_description}
            placeholder="e.g. Foundry70 is a digital agency specialising in web development, AI integration, and business automation for SMEs in Hertfordshire."
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">AI Writing Tone</label>
          <p className="text-muted text-xs mb-1.5">How the AI should write emails and messages.</p>
          <select
            name="ai_tone"
            defaultValue={s.ai_tone || "professional"}
            className="border border-border rounded-lg w-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
          >
            <option value="professional">Professional - formal and business-like</option>
            <option value="friendly">Friendly - warm and approachable</option>
            <option value="casual">Casual - relaxed and conversational</option>
            <option value="concise">Concise - brief and to the point</option>
            <option value="persuasive">Persuasive - compelling and sales-oriented</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-accent text-white px-5 py-2 rounded-lg text-sm hover:bg-accent-hover transition-colors"
        >
          Save Settings
        </button>
      </form>

      {/* API Keys */}
      <div className="bg-card-bg rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted">API Keys</h2>
            <p className="text-muted text-xs mt-1">
              Use API keys to access the CRM programmatically. Keys have the same access level as your account.
            </p>
          </div>
        </div>

        {/* Create key */}
        <ApiKeyCreate />

        {/* Key list */}
        {keys.length === 0 ? (
          <p className="text-muted text-sm mt-4">No API keys yet.</p>
        ) : (
          <div className="mt-4 space-y-2">
            {keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between py-2 border-t border-border first:border-0">
                <div>
                  <p className="text-sm font-medium">{k.name}</p>
                  <p className="text-xs text-muted">
                    {k.keyPrefix}... &middot; Created {timeAgo(k.createdAt)}
                    {k.lastUsedAt && <> &middot; Last used {timeAgo(k.lastUsedAt)}</>}
                  </p>
                </div>
                <ConfirmDelete
                  action={deleteApiKey.bind(null, k.id)}
                  label="Revoke"
                  message="Revoke this API key? Any integrations using it will stop working."
                  className="text-danger text-xs hover:underline"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
