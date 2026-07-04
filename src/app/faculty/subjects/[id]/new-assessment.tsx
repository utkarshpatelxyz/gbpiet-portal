"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NewAssessment({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"class_test" | "final">("class_test");
  const [maxMarks, setMaxMarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("assessments").insert({
      subject_id: subjectId,
      title: title.trim(),
      type,
      max_marks: Number(maxMarks),
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setTitle("");
    setMaxMarks("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1">
        <label htmlFor="atitle" className="block text-sm font-medium text-slate-700">
          Title
        </label>
        <input id="atitle" required value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Class Test 1 / End Semester Exam"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
      </div>
      <div>
        <label htmlFor="atype" className="block text-sm font-medium text-slate-700">
          Type
        </label>
        <select id="atype" value={type}
          onChange={(e) => setType(e.target.value as "class_test" | "final")}
          className="mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <option value="class_test">Class test</option>
          <option value="final">Final exam</option>
        </select>
      </div>
      <div>
        <label htmlFor="amax" className="block text-sm font-medium text-slate-700">
          Max marks
        </label>
        <input id="amax" type="number" min={1} required value={maxMarks}
          onChange={(e) => setMaxMarks(e.target.value)}
          className="mt-1 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
      </div>
      <button type="submit" disabled={saving}
        className="cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? "Adding…" : "Add assessment"}
      </button>
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
    </form>
  );
}
