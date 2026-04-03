"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

type PersonData = {
  person: {
    id: number; name: string; email: string | null; phone: string | null;
    position: string | null; linkedin: string | null; notes: string | null;
    lastContactedAt: string | null; createdAt: string;
  };
  company: { id: number; name: string; industry: string | null; website: string | null; email: string | null; phone: string | null } | null;
  emails: { id: number; subject: string | null; direction: string; createdAt: string }[];
  todos: { id: number; title: string; dueDate: string | null; done: boolean }[];
  activities: { id: number; type: string; title: string; notes: string | null; createdAt: string }[];
  tags: { entityTagId: number; tagId: number; name: string; colour: string }[];
  groups: { groupId: number; name: string; colour: string }[];
};

type EditFields = {
  name: string; email: string; phone: string; position: string;
  linkedin: string; notes: string;
};

export default function ReviewCards({
  personIds,
  trigger,
}: {
  personIds: number[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [data, setData] = useState<PersonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFields, setEditFields] = useState<EditFields | null>(null);
  const [saving, setSaving] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const currentId = personIds[index];

  const fetchPerson = useCallback(async (id: number) => {
    setLoading(true);
    setEditing(false);
    setEditFields(null);
    try {
      const res = await fetch(`/api/persons/${id}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open && currentId) fetchPerson(currentId);
  }, [open, currentId, fetchPerson]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(personIds.length - 1, i + 1));
      else if (e.key === "Escape") { setOpen(false); setEditing(false); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, personIds.length]);

  // Voice control context
  useEffect(() => {
    if (open && currentId) {
      (window as unknown as Record<string, unknown>).__reviewPersonId = currentId;
    } else {
      delete (window as unknown as Record<string, unknown>).__reviewPersonId;
    }
  }, [open, currentId]);

  function startEdit() {
    if (!data) return;
    setEditing(true);
    setEditFields({
      name: data.person.name,
      email: data.person.email || "",
      phone: data.person.phone || "",
      position: data.person.position || "",
      linkedin: data.person.linkedin || "",
      notes: data.person.notes || "",
    });
  }

  async function saveEdit() {
    if (!editFields || !currentId) return;
    setSaving(true);
    const formData = new FormData();
    Object.entries(editFields).forEach(([k, v]) => formData.append(k, v));
    try {
      await fetch(`/api/persons/${currentId}`, { method: "PATCH", body: formData });
      await fetchPerson(currentId);
      setEditing(false);
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function markContacted() {
    if (!currentId) return;
    await fetch(`/api/persons/${currentId}/contacted`, { method: "POST" });
    await fetchPerson(currentId);
  }

  function timeAgo(date: string | null): string {
    if (!date) return "Never";
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }

  if (personIds.length === 0) return null;

  return (
    <>
      <span onClick={() => { setIndex(0); setOpen(true); }}>{trigger}</span>

      {open && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setOpen(false); setEditing(false); }}>
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-card-bg rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-border/40"
          >
            {/* Company header */}
            {data?.company && (
              <div className="px-6 py-3 bg-stone-50 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 text-xs font-bold">
                    {data.company.name[0]}
                  </span>
                  <div>
                    <Link href={`/companies/${data.company.id}`} className="text-sm font-semibold hover:text-accent transition-colors" onClick={() => setOpen(false)}>
                      {data.company.name}
                    </Link>
                    <p className="text-[11px] text-muted">
                      {[data.company.industry, data.company.website].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation bar */}
            <div className="px-6 py-2.5 border-b border-border/40 flex items-center justify-between bg-white">
              <button
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <span className="text-xs text-muted font-medium">{index + 1} of {personIds.length}</span>
              <div className="flex items-center gap-2">
                {!editing && (
                  <button onClick={startEdit} className="text-xs text-accent hover:underline font-medium">Edit</button>
                )}
                <Link href={`/persons/${currentId}`} className="text-xs text-muted hover:text-foreground" onClick={() => setOpen(false)}>
                  Full page
                </Link>
              </div>
              <button
                onClick={() => setIndex((i) => Math.min(personIds.length - 1, i + 1))}
                disabled={index === personIds.length - 1}
                className="p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                </div>
              ) : data ? (
                <div className="space-y-5">
                  {/* Person header */}
                  <div className="flex items-start justify-between">
                    <div>
                      {editing ? (
                        <input
                          value={editFields?.name || ""}
                          onChange={(e) => setEditFields((f) => f ? { ...f, name: e.target.value } : f)}
                          className="text-xl font-bold border border-border rounded-lg px-2 py-1 w-full"
                        />
                      ) : (
                        <h2 className="text-xl font-bold tracking-tight">{data.person.name}</h2>
                      )}
                      {!editing && data.person.position && (
                        <p className="text-sm text-muted mt-0.5">{data.person.position}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {data.tags.map((t) => (
                        <span key={t.tagId} className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: t.colour }}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Groups */}
                  {data.groups.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {data.groups.map((g) => (
                        <span key={g.groupId} className="text-[10px] px-2 py-0.5 rounded-md font-medium border" style={{ borderColor: g.colour, color: g.colour }}>
                          {g.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Contact info grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <InfoField label="Email" value={data.person.email} editing={editing}
                      editValue={editFields?.email} onChange={(v) => setEditFields((f) => f ? { ...f, email: v } : f)} />
                    <InfoField label="Phone" value={data.person.phone} editing={editing}
                      editValue={editFields?.phone} onChange={(v) => setEditFields((f) => f ? { ...f, phone: v } : f)} />
                    <InfoField label="Position" value={data.person.position} editing={editing}
                      editValue={editFields?.position} onChange={(v) => setEditFields((f) => f ? { ...f, position: v } : f)} />
                    <InfoField label="LinkedIn" value={data.person.linkedin} editing={editing}
                      editValue={editFields?.linkedin} onChange={(v) => setEditFields((f) => f ? { ...f, linkedin: v } : f)}
                      isLink />
                    <div className="col-span-2">
                      <InfoField label="Notes" value={data.person.notes} editing={editing}
                        editValue={editFields?.notes} onChange={(v) => setEditFields((f) => f ? { ...f, notes: v } : f)}
                        multiline />
                    </div>
                  </div>

                  {/* Edit save/cancel buttons */}
                  {editing && (
                    <div className="flex gap-2">
                      <button onClick={saveEdit} disabled={saving}
                        className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50">
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button onClick={() => setEditing(false)}
                        className="border border-border px-4 py-2 rounded-lg text-sm text-muted hover:bg-stone-50 transition-colors">
                        Cancel
                      </button>
                    </div>
                  )}

                  {/* Last contacted + mark */}
                  <div className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-[10px] text-muted uppercase tracking-wider font-semibold">Last Contacted</p>
                      <p className={`text-sm font-medium ${!data.person.lastContactedAt ? "text-danger" : "text-foreground"}`}>
                        {timeAgo(data.person.lastContactedAt)}
                      </p>
                    </div>
                    <button onClick={markContacted}
                      className="bg-success text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600 transition-colors">
                      Mark Contacted
                    </button>
                  </div>

                  {/* Recent activity */}
                  {data.activities.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Recent Activity</h3>
                      <div className="space-y-1.5">
                        {data.activities.slice(0, 5).map((a) => (
                          <div key={a.id} className="flex items-center gap-2 text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              a.type === "call" ? "bg-emerald-400" :
                              a.type === "meeting" ? "bg-violet-400" :
                              a.type === "email" ? "bg-teal-400" : "bg-stone-300"
                            }`} />
                            <span className="text-foreground font-medium">{a.title}</span>
                            <span className="text-muted ml-auto">{timeAgo(a.createdAt)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Emails + Todos side by side */}
                  <div className="grid grid-cols-2 gap-4">
                    {data.emails.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Emails</h3>
                        <div className="space-y-1">
                          {data.emails.slice(0, 5).map((e) => (
                            <div key={e.id} className="flex items-center gap-2 text-xs">
                              <span className={`text-[10px] font-bold ${e.direction === "inbound" ? "text-emerald-600" : "text-teal-600"}`}>
                                {e.direction === "inbound" ? "IN" : "OUT"}
                              </span>
                              <span className="truncate text-foreground">{e.subject || "(no subject)"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {data.todos.length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Todos</h3>
                        <div className="space-y-1">
                          {data.todos.slice(0, 5).map((t) => (
                            <div key={t.id} className="flex items-center gap-2 text-xs">
                              <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                                t.done ? "border-success bg-success/20" : "border-stone-300"
                              }`}>
                                {t.done && <span className="text-success text-[8px]">&#10003;</span>}
                              </span>
                              <span className={`truncate ${t.done ? "line-through text-muted" : "text-foreground"}`}>{t.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-muted text-sm text-center py-12">Person not found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function InfoField({
  label, value, editing, editValue, onChange, isLink, multiline,
}: {
  label: string; value: string | null; editing: boolean;
  editValue?: string; onChange?: (v: string) => void;
  isLink?: boolean; multiline?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1">{label}</p>
      {editing ? (
        multiline ? (
          <textarea value={editValue || ""} onChange={(e) => onChange?.(e.target.value)} rows={3}
            className="border border-border rounded-lg w-full px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
        ) : (
          <input value={editValue || ""} onChange={(e) => onChange?.(e.target.value)}
            className="border border-border rounded-lg w-full px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
        )
      ) : value ? (
        isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline truncate block">{value}</a>
        ) : (
          <p className="text-sm">{value}</p>
        )
      ) : (
        <p className="text-sm text-muted">-</p>
      )}
    </div>
  );
}
