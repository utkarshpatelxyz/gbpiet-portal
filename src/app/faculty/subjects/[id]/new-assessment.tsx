"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewAssessment({
  subjectId,
  hasFinal,
}: {
  subjectId: string;
  hasFinal: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"class_test" | "final">("class_test");
  const [maxMarks, setMaxMarks] = useState("");
  const [passingMarks, setPassingMarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (Number(passingMarks) > Number(maxMarks)) {
      setError("Passing marks cannot exceed maximum marks.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("assessments").insert({
      subject_id: subjectId,
      title: title.trim(),
      type,
      max_marks: Number(maxMarks),
      passing_marks: Number(passingMarks),
    });
    setSaving(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "A Final Exam already exists for this subject — only one is allowed."
          : error.message
      );
      return;
    }
    setTitle("");
    setMaxMarks("");
    setPassingMarks("");
    setType("class_test");
    router.refresh();
  }

  const inputCls =
    "mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <label htmlFor="atitle" className="block text-sm font-medium text-slate-700">
          Title
        </label>
        <input id="atitle" required value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Class Test 1 / End Semester Exam"
          className={`${inputCls} w-full`} />
      </div>
      <div>
        <label htmlFor="atype" className="block text-sm font-medium text-slate-700">
          Type
        </label>
        <select id="atype" value={type}
          onChange={(e) => setType(e.target.value as "class_test" | "final")}
          className={inputCls}>
          <option value="class_test">Class test</option>
          <option value="final" disabled={hasFinal}>
            Final exam{hasFinal ? " (already created)" : ""}
          </option>
        </select>
      </div>
      <div>
        <label htmlFor="amax" className="block text-sm font-medium text-slate-700">
          Max marks
        </label>
        <input id="amax" type="number" min={1} required value={maxMarks}
          onChange={(e) => setMaxMarks(e.target.value)} className={`${inputCls} w-24`} />
      </div>
      <div>
        <label htmlFor="apass" className="block text-sm font-medium text-slate-700">
          Passing marks
        </label>
        <input id="apass" type="number" min={0} required value={passingMarks}
          onChange={(e) => setPassingMarks(e.target.value)} className={`${inputCls} w-24`} />
      </div>
      <button type="submit" disabled={saving}
        className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? "Adding…" : "Add assessment"}
      </button>
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
    </form>
  );
}
