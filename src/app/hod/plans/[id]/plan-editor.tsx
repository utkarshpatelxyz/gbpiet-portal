"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Subject = {
  id: string;
  name: string;
  code: string;
  faculty_id: string;
  kind: "fixed" | "elective";
  is_lab: boolean;
  parent_subject_id: string | null;
};
type Draft = Omit<Subject, "id">;

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

const EMPTY: Draft = {
  name: "",
  code: "",
  faculty_id: "",
  kind: "fixed",
  is_lab: false,
  parent_subject_id: null,
};

export default function PlanEditor({
  planId,
  classroomId,
  status,
  faculty,
  initialSubjects,
}: {
  planId: string;
  classroomId: number;
  status: "draft" | "published";
  faculty: { id: string; name: string }[];
  initialSubjects: Subject[];
}) {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  const nonLabSubjects = subjects.filter((s) => !s.is_lab);
  const facultyName = (id: string) => faculty.find((f) => f.id === id)?.name ?? "—";

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("subjects")
      .insert({
        plan_id: planId,
        classroom_id: classroomId,
        name: draft.name.trim(),
        code: draft.code.trim().toUpperCase(),
        faculty_id: draft.faculty_id,
        kind: draft.kind,
        is_lab: draft.is_lab,
        parent_subject_id: draft.is_lab ? draft.parent_subject_id : null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "A subject with this code already exists in this semester."
          : error.message
      );
      return;
    }
    setSubjects((s) => [...s, { ...draft, id: data.id, code: draft.code.trim().toUpperCase() }]);
    setDraft(EMPTY);
    router.refresh();
  }

  function startEdit(s: Subject) {
    setEditingId(s.id);
    setEdit({ ...s });
  }

  async function saveEdit(id: string) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("subjects")
      .update({
        name: edit.name.trim(),
        code: edit.code.trim().toUpperCase(),
        faculty_id: edit.faculty_id,
        kind: edit.kind,
        parent_subject_id: edit.is_lab ? edit.parent_subject_id : null,
      })
      .eq("id", id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSubjects((list) =>
      list.map((s) => (s.id === id ? { ...s, ...edit, code: edit.code.trim().toUpperCase() } : s))
    );
    setEditingId(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this row from the plan?")) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSubjects((list) => list.filter((s) => s.id !== id));
    router.refresh();
  }

  async function publish() {
    if (
      !window.confirm(
        "Publish this semester plan? Eligible students will immediately see the registration form and assigned faculty will see their subjects."
      )
    )
      return;
    setPublishing(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("semester_plans")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", planId);
    setPublishing(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  const rowFields = (d: Draft, set: (d: Draft) => void, idPrefix: string) => (
    <>
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-name`} className="block text-xs font-medium text-slate-600">
          {d.is_lab ? "Lab name" : "Subject name"}
        </label>
        <input id={`${idPrefix}-name`} required value={d.name}
          onChange={(e) => set({ ...d, name: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-code`} className="block text-xs font-medium text-slate-600">Code</label>
        <input id={`${idPrefix}-code`} required value={d.code}
          onChange={(e) => set({ ...d, code: e.target.value })} className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-fac`} className="block text-xs font-medium text-slate-600">Faculty</label>
        <select id={`${idPrefix}-fac`} required value={d.faculty_id}
          onChange={(e) => set({ ...d, faculty_id: e.target.value })} className={inputCls}>
          <option value="">Select…</option>
          {faculty.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-kind`} className="block text-xs font-medium text-slate-600">Type</label>
        <select id={`${idPrefix}-kind`} value={d.kind}
          onChange={(e) => set({ ...d, kind: e.target.value as "fixed" | "elective" })}
          className={inputCls}>
          <option value="fixed">Fixed (compulsory)</option>
          <option value="elective">Elective</option>
        </select>
      </div>
      {d.is_lab && (
        <div>
          <label htmlFor={`${idPrefix}-parent`} className="block text-xs font-medium text-slate-600">
            Linked subject (optional)
          </label>
          <select id={`${idPrefix}-parent`} value={d.parent_subject_id ?? ""}
            onChange={(e) => set({ ...d, parent_subject_id: e.target.value || null })}
            className={inputCls}>
            <option value="">Standalone lab</option>
            {nonLabSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );

  const renderList = (isLab: boolean) => {
    const list = subjects.filter((s) => s.is_lab === isLab);
    if (list.length === 0)
      return (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">
          {isLab ? "No labs added yet." : "No subjects added yet."}
        </p>
      );
    return (
      <ul className="divide-y divide-slate-100">
        {list.map((s) =>
          editingId === s.id ? (
            <li key={s.id} className="py-4">
              <div className="grid gap-3 sm:grid-cols-5">
                {rowFields(edit, setEdit, `e-${s.id}`)}
              </div>
              <div className="mt-3 flex gap-2">
                <button type="button" disabled={busy} onClick={() => saveEdit(s.id)}
                  className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:opacity-60">
                  Save
                </button>
                <button type="button" onClick={() => setEditingId(null)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </li>
          ) : (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {s.name}{" "}
                  <span className="font-normal text-slate-500">({s.code})</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                      s.kind === "fixed"
                        ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20"
                        : "bg-purple-50 text-purple-700 ring-purple-600/20"
                    }`}
                  >
                    {s.kind === "fixed" ? "Fixed" : "Elective"}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Faculty: {facultyName(s.faculty_id)}
                  {s.is_lab &&
                    (s.parent_subject_id
                      ? ` · linked to ${
                          nonLabSubjects.find((x) => x.id === s.parent_subject_id)?.name ?? "subject"
                        }`
                      : " · standalone lab")}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => startEdit(s)}
                  className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50">
                  Edit
                </button>
                <button type="button" disabled={busy} onClick={() => remove(s.id)}
                  className="cursor-pointer rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-600 transition-colors duration-200 hover:bg-rose-50 disabled:opacity-60">
                  Remove
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Subjects</h2>
        </div>
        <div className="p-5">{renderList(false)}</div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Labs</h2>
        </div>
        <div className="p-5">{renderList(true)}</div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            Add {draft.is_lab ? "a lab" : "a subject"}
          </h2>
        </div>
        <form onSubmit={addRow} className="grid gap-3 p-5 sm:grid-cols-5">
          <div className="sm:col-span-5 flex gap-2">
            {([false, true] as const).map((lab) => (
              <button
                key={String(lab)}
                type="button"
                onClick={() => setDraft({ ...draft, is_lab: lab, parent_subject_id: null })}
                className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
                  draft.is_lab === lab
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {lab ? "Lab" : "Subject"}
              </button>
            ))}
          </div>
          {rowFields(draft, setDraft, "new")}
          <div className="sm:col-span-5">
            <button type="submit" disabled={busy}
              className="cursor-pointer rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Adding…" : draft.is_lab ? "Add lab" : "Add subject"}
            </button>
          </div>
        </form>
      </section>

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      )}

      {status === "draft" ? (
        <div className="flex items-center justify-end gap-4 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-sm text-indigo-800">
            Publishing opens student registration and notifies assigned faculty
            of their subjects. You can still edit details afterwards.
          </p>
          <button type="button" disabled={publishing || subjects.length === 0} onClick={publish}
            className="cursor-pointer whitespace-nowrap rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            {publishing ? "Publishing…" : "Publish plan"}
          </button>
        </div>
      ) : (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          This plan is published. Students can register and faculty can see
          their assigned subjects. Edits you make here (names, codes, faculty)
          apply immediately.
        </p>
      )}
    </div>
  );
}
