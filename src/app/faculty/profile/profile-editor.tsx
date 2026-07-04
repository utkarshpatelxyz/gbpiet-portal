"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Designation = { title: string; period: string };
type Education = { level: string; degree: string; institution: string; year: string };
type Award = { title: string; year: string };

const EDUCATION_LEVELS = [
  "10th",
  "12th",
  "Graduation",
  "Post-graduation",
  "PhD",
  "Post-Doctorate",
  "Other",
];

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const removeBtn =
  "cursor-pointer rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-600 transition-colors duration-200 hover:bg-rose-50";
const addBtn =
  "cursor-pointer rounded-lg border border-indigo-300 px-4 py-1.5 text-sm font-medium text-indigo-700 transition-colors duration-200 hover:bg-indigo-50";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="space-y-3 p-5">{children}</div>
    </section>
  );
}

export default function ProfileEditor({
  initial,
}: {
  initial: {
    designations: Designation[];
    expertise: string[];
    education: Education[];
    awards: Award[];
  };
}) {
  const router = useRouter();
  const [designations, setDesignations] = useState<Designation[]>(initial.designations);
  const [expertise, setExpertise] = useState<string[]>(initial.expertise);
  const [education, setEducation] = useState<Education[]>(initial.education);
  const [awards, setAwards] = useState<Award[]>(initial.awards);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("faculty")
      .update({
        designations: designations.filter((d) => d.title.trim()),
        expertise: expertise.filter((e) => e.trim()),
        education: education.filter((e) => e.level.trim() || e.degree.trim()),
        awards: awards.filter((a) => a.title.trim()),
      })
      .eq("id", user!.id);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSavedAt(new Date().toLocaleTimeString());
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Section title="Designations (current and past)">
        {designations.map((d, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label htmlFor={`dt-${i}`} className="block text-xs font-medium text-slate-600">Title</label>
              <input id={`dt-${i}`} value={d.title} placeholder="e.g. Assistant Professor"
                onChange={(e) =>
                  setDesignations((l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                } className={inputCls} />
            </div>
            <div className="min-w-40">
              <label htmlFor={`dp-${i}`} className="block text-xs font-medium text-slate-600">Period</label>
              <input id={`dp-${i}`} value={d.period} placeholder="e.g. 2019 – present"
                onChange={(e) =>
                  setDesignations((l) => l.map((x, j) => (j === i ? { ...x, period: e.target.value } : x)))
                } className={inputCls} />
            </div>
            <button type="button" className={removeBtn}
              onClick={() => setDesignations((l) => l.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className={addBtn}
          onClick={() => setDesignations((l) => [...l, { title: "", period: "" }])}>
          + Add designation
        </button>
      </Section>

      <Section title="Areas of expertise">
        {expertise.map((x, i) => (
          <div key={i} className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor={`ex-${i}`} className="sr-only">Expertise {i + 1}</label>
              <input id={`ex-${i}`} value={x} placeholder="e.g. Thermal Engineering"
                onChange={(e) =>
                  setExpertise((l) => l.map((v, j) => (j === i ? e.target.value : v)))
                } className={inputCls} />
            </div>
            <button type="button" className={removeBtn}
              onClick={() => setExpertise((l) => l.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className={addBtn}
          onClick={() => setExpertise((l) => [...l, ""])}>
          + Add area
        </button>
      </Section>

      <Section title="Education">
        {education.map((ed, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div className="min-w-36">
              <label htmlFor={`el-${i}`} className="block text-xs font-medium text-slate-600">Level</label>
              <select id={`el-${i}`} value={ed.level}
                onChange={(e) =>
                  setEducation((l) => l.map((x, j) => (j === i ? { ...x, level: e.target.value } : x)))
                } className={inputCls}>
                <option value="">Select…</option>
                {EDUCATION_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>{lv}</option>
                ))}
              </select>
            </div>
            <div className="min-w-40">
              <label htmlFor={`ed-${i}`} className="block text-xs font-medium text-slate-600">
                Degree / board
              </label>
              <input id={`ed-${i}`} value={ed.degree} placeholder="e.g. B.Tech (Mechanical)"
                onChange={(e) =>
                  setEducation((l) => l.map((x, j) => (j === i ? { ...x, degree: e.target.value } : x)))
                } className={inputCls} />
            </div>
            <div className="min-w-48 flex-1">
              <label htmlFor={`ei-${i}`} className="block text-xs font-medium text-slate-600">Institution</label>
              <input id={`ei-${i}`} value={ed.institution}
                onChange={(e) =>
                  setEducation((l) => l.map((x, j) => (j === i ? { ...x, institution: e.target.value } : x)))
                } className={inputCls} />
            </div>
            <div className="w-24">
              <label htmlFor={`ey-${i}`} className="block text-xs font-medium text-slate-600">Year</label>
              <input id={`ey-${i}`} value={ed.year}
                onChange={(e) =>
                  setEducation((l) => l.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))
                } className={inputCls} />
            </div>
            <button type="button" className={removeBtn}
              onClick={() => setEducation((l) => l.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className={addBtn}
          onClick={() =>
            setEducation((l) => [...l, { level: "", degree: "", institution: "", year: "" }])
          }>
          + Add education
        </button>
      </Section>

      <Section title="Awards & honors">
        {awards.map((a, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1">
              <label htmlFor={`at-${i}`} className="block text-xs font-medium text-slate-600">Award</label>
              <input id={`at-${i}`} value={a.title}
                onChange={(e) =>
                  setAwards((l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                } className={inputCls} />
            </div>
            <div className="w-24">
              <label htmlFor={`ay-${i}`} className="block text-xs font-medium text-slate-600">Year</label>
              <input id={`ay-${i}`} value={a.year}
                onChange={(e) =>
                  setAwards((l) => l.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))
                } className={inputCls} />
            </div>
            <button type="button" className={removeBtn}
              onClick={() => setAwards((l) => l.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className={addBtn}
          onClick={() => setAwards((l) => [...l, { title: "", year: "" }])}>
          + Add award
        </button>
      </Section>

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>
      )}

      <div className="flex items-center justify-end gap-4">
        {savedAt && <p className="text-sm text-emerald-700">Saved at {savedAt}</p>}
        <button type="button" onClick={save} disabled={saving}
          className="cursor-pointer rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}
