"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  roll_no: string;
  enrollment_no: string;
  full_name: string;
};
type Self = "present" | "on_leave" | null;
type Final = "present" | "absent" | "on_leave";

export default function FinalizeBoard({
  sessionId,
  students,
  initialSelf,
}: {
  sessionId: string;
  students: Student[];
  initialSelf: Record<string, Self>;
}) {
  const router = useRouter();
  const [selfMarks, setSelfMarks] = useState<Record<string, Self>>(initialSelf);
  const [finals, setFinals] = useState<Record<string, Final>>(() => {
    const init: Record<string, Final> = {};
    for (const st of students) {
      const s = initialSelf[st.id];
      init[st.id] = s === "present" ? "present" : s === "on_leave" ? "on_leave" : "absent";
    }
    return init;
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live poll of student self-marks so the teacher can cross-check headcount.
  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("attendance_records")
      .select("student_id, self_status")
      .eq("session_id", sessionId);
    if (!data) return;
    setSelfMarks((prev) => {
      const next: Record<string, Self> = { ...prev };
      for (const r of data) next[r.student_id] = r.self_status as Self;
      return next;
    });
    setFinals((prev) => {
      const next = { ...prev };
      for (const r of data) {
        if (!touched[r.student_id] && r.self_status) {
          next[r.student_id] = r.self_status as Final;
        }
      }
      return next;
    });
  }, [sessionId, touched]);

  useEffect(() => {
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const selfPresent = students.filter((s) => selfMarks[s.id] === "present").length;
  const selfLeave = students.filter((s) => selfMarks[s.id] === "on_leave").length;
  const unmarked = students.length - selfPresent - selfLeave;
  const finalPresent = students.filter((s) => finals[s.id] === "present").length;

  async function finalize() {
    if (
      !window.confirm(
        `Finalize attendance? ${finalPresent} of ${students.length} will be marked Present. This locks the record permanently for everyone.`
      )
    )
      return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = students.map((s) => ({
      student_id: s.id,
      final_status: finals[s.id],
    }));
    const { error } = await supabase.rpc("finalize_attendance", {
      p_session_id: sessionId,
      p_finals: payload,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  function setFinal(id: string, v: Final) {
    setTouched((t) => ({ ...t, [id]: true }));
    setFinals((f) => ({ ...f, [id]: v }));
  }

  const chip = (s: Self) =>
    s === "present" ? (
      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
        Self: Present
      </span>
    ) : s === "on_leave" ? (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
        Self: On Leave
      </span>
    ) : (
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 ring-1 ring-inset ring-slate-400/20">
        Not marked
      </span>
    );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium text-emerald-700">Self-marked Present</p>
          <p className="text-2xl font-bold text-emerald-800">
            {selfPresent} <span className="text-sm font-medium">of {students.length}</span>
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-medium text-amber-700">Self-marked On Leave</p>
          <p className="text-2xl font-bold text-amber-800">{selfLeave}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Not marked (call out names)</p>
          <p className="text-2xl font-bold text-slate-800">{unmarked}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs font-medium text-indigo-700">Final Present (your count)</p>
          <p className="text-2xl font-bold text-indigo-800">{finalPresent}</p>
        </div>
      </div>

      <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-800">
        Count heads in the room and compare with the live numbers above.
        Self-marks are advisory only — you set the final status. For students
        who did not mark, call their name: present students can still
        self-mark (this list refreshes automatically), or set them Present
        yourself. This page updates every few seconds.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Roll</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Self-mark</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Final status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((st) => (
              <tr key={st.id}>
                <td className="px-4 py-2.5 text-sm text-slate-700">{st.roll_no}</td>
                <td className="px-4 py-2.5">
                  <p className="text-sm font-medium text-slate-900">{st.full_name}</p>
                  <p className="text-xs text-slate-500">{st.enrollment_no}</p>
                </td>
                <td className="px-4 py-2.5">{chip(selfMarks[st.id] ?? null)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1.5" role="radiogroup" aria-label={`Final status for ${st.full_name}`}>
                    {(
                      [
                        ["present", "Present", "bg-emerald-600 text-white", "border-emerald-300 text-emerald-700 hover:bg-emerald-50"],
                        ["absent", "Absent", "bg-rose-600 text-white", "border-rose-300 text-rose-700 hover:bg-rose-50"],
                        ["on_leave", "On Leave", "bg-amber-500 text-white", "border-amber-300 text-amber-700 hover:bg-amber-50"],
                      ] as const
                    ).map(([value, label, active, idle]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={finals[st.id] === value}
                        onClick={() => setFinal(st.id, value)}
                        className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors duration-150 ${
                          finals[st.id] === value ? active : `border bg-white ${idle}`
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      )}

      <div className="flex items-center justify-end gap-4">
        <p className="text-sm text-slate-600">
          Finalizing locks this session permanently — no edits by anyone.
        </p>
        <button
          type="button"
          onClick={finalize}
          disabled={saving || students.length === 0}
          className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Finalizing…" : "Finalize & lock attendance"}
        </button>
      </div>
    </div>
  );
}
