"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Reappearance({
  subjectId,
  studentId,
  studentName,
}: {
  subjectId: string;
  studentId: string;
  studentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [maxMarks, setMaxMarks] = useState("");
  const [passingMarks, setPassingMarks] = useState("");
  const [obtained, setObtained] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const max = Number(maxMarks);
    const pass = Number(passingMarks);
    const got = Number(obtained);
    if (pass > max) {
      setError("Passing marks cannot exceed maximum marks.");
      return;
    }
    if (got > max) {
      setError("Obtained marks cannot exceed maximum marks.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("final_attempts").insert({
      subject_id: subjectId,
      student_id: studentId,
      max_marks: max,
      passing_marks: pass,
      marks_obtained: got,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  const inputCls =
    "mt-1 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{studentName}</p>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700"
          >
            Record re-appearance attempt
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={`rmax-${studentId}`} className="block text-xs font-medium text-slate-600">
              New max marks
            </label>
            <input id={`rmax-${studentId}`} type="number" min={1} required value={maxMarks}
              onChange={(e) => setMaxMarks(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor={`rpass-${studentId}`} className="block text-xs font-medium text-slate-600">
              New passing marks
            </label>
            <input id={`rpass-${studentId}`} type="number" min={0} required value={passingMarks}
              onChange={(e) => setPassingMarks(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor={`robt-${studentId}`} className="block text-xs font-medium text-slate-600">
              Obtained marks
            </label>
            <input id={`robt-${studentId}`} type="number" min={0} step="0.5" required value={obtained}
              onChange={(e) => setObtained(e.target.value)} className={inputCls} />
          </div>
          <button type="submit" disabled={saving}
            className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving…" : "Save attempt"}
          </button>
          <button type="button" onClick={() => setOpen(false)}
            className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-white">
            Cancel
          </button>
          {error && <p className="w-full text-sm text-rose-600">{error}</p>}
        </form>
      )}
    </div>
  );
}
