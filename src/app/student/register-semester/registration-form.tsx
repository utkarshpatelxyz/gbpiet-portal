"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type PlanSubject = {
  id: string;
  name: string;
  code: string;
  kind: "fixed" | "elective";
  is_lab: boolean;
  parent_subject_id: string | null;
  faculty_id: string;
  faculty_name: string;
};

export default function RegistrationForm({
  planId,
  semester,
  subjects,
}: {
  planId: string;
  semester: number;
  subjects: PlanSubject[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mains = subjects.filter((s) => !s.is_lab);
  const labs = subjects.filter((s) => s.is_lab);
  const electives = subjects.filter(
    (s) => s.kind === "elective" && (!s.is_lab || s.parent_subject_id === null)
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isIncluded = (s: PlanSubject): boolean => {
    if (s.kind === "fixed" && (!s.is_lab || s.parent_subject_id === null)) return true;
    if (selected.has(s.id)) return true;
    if (s.is_lab && s.parent_subject_id) {
      const parent = subjects.find((x) => x.id === s.parent_subject_id);
      return parent ? isIncluded(parent) : false;
    }
    return false;
  };

  async function submit() {
    if (
      !window.confirm(
        `Submit your Semester ${semester} registration? This moves you into the new semester with the subjects shown as included.`
      )
    )
      return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("register_semester", {
      p_plan_id: planId,
      p_elective_ids: [...selected],
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/student");
    router.refresh();
  }

  const row = (s: PlanSubject) => {
    const included = isIncluded(s);
    const selectable = s.kind === "elective" && (!s.is_lab || s.parent_subject_id === null);
    return (
      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <label
          htmlFor={`sub-${s.id}`}
          className={`flex items-center gap-3 ${selectable ? "cursor-pointer" : ""}`}
        >
          <input
            id={`sub-${s.id}`}
            type="checkbox"
            checked={included}
            disabled={!selectable}
            onChange={() => selectable && toggle(s.id)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-70"
          />
          <span>
            <span className="text-sm font-semibold text-slate-900">
              {s.name}{" "}
              <span className="font-normal text-slate-500">({s.code})</span>
            </span>
            <span
              className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                s.kind === "fixed"
                  ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20"
                  : "bg-purple-50 text-purple-700 ring-purple-600/20"
              }`}
            >
              {s.kind === "fixed" ? "Fixed" : "Elective"}
            </span>
            {s.is_lab && (
              <span className="ml-1.5 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                Lab
              </span>
            )}
            {s.is_lab && s.parent_subject_id && (
              <span className="ml-1.5 text-xs text-slate-500">
                (follows {subjects.find((x) => x.id === s.parent_subject_id)?.name})
              </span>
            )}
          </span>
        </label>
        <Link
          href={`/faculty-profile/${s.faculty_id}`}
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          {s.faculty_name} →
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">Subjects</h2>
        </div>
        <div className="px-5 py-2">
          <ul className="divide-y divide-slate-100">{mains.map(row)}</ul>
        </div>
      </section>

      {labs.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-900">Labs</h2>
          </div>
          <div className="px-5 py-2">
            <ul className="divide-y divide-slate-100">{labs.map(row)}</ul>
          </div>
        </section>
      )}

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      )}

      <div className="flex items-center justify-end gap-4">
        <p className="text-sm text-slate-600">
          {subjects.filter(isIncluded).length} of {subjects.length} subjects included
          {electives.length > 0 &&
            ` · ${electives.filter((e) => selected.has(e.id)).length} of ${electives.length} electives chosen`}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={submit}
          className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Submitting…" : `Register for Semester ${semester}`}
        </button>
      </div>
    </div>
  );
}
