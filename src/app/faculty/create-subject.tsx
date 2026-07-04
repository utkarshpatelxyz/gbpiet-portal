"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Branch = { id: number; name: string };
type Classroom = { id: number; branch_id: number; year: number; semester: number };

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const labelCls = "block text-sm font-medium text-slate-700";

export default function CreateSubject() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [branchId, setBranchId] = useState<number | "">("");
  const [semester, setSemester] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("branches").select("id, name").order("name")
      .then(({ data }) => setBranches(data ?? []));
    supabase.from("classrooms").select("id, branch_id, year, semester")
      .then(({ data }) => setClassrooms(data ?? []));
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (branchId === "" || semester === "") {
      setError("Select the target classroom (branch and semester).");
      return;
    }
    const classroom = classrooms.find(
      (c) => c.branch_id === Number(branchId) && c.semester === Number(semester)
    );
    if (!classroom) {
      setError("No classroom found for that selection.");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("subjects").insert({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      classroom_id: classroom.id,
      faculty_id: user!.id,
    });
    setSaving(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "A subject with this code already exists in that classroom."
          : error.message
      );
      return;
    }
    setName("");
    setCode("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="sname" className={labelCls}>Subject name</label>
        <input id="sname" required value={name}
          onChange={(e) => setName(e.target.value)} className={inputCls}
          placeholder="e.g. Manufacturing Science" />
      </div>
      <div>
        <label htmlFor="scode" className={labelCls}>Subject code</label>
        <input id="scode" required value={code}
          onChange={(e) => setCode(e.target.value)} className={inputCls}
          placeholder="e.g. TME-201" />
      </div>
      <div>
        <label htmlFor="sbranch" className={labelCls}>Branch</label>
        <select id="sbranch" required value={branchId}
          onChange={(e) => setBranchId(e.target.value === "" ? "" : Number(e.target.value))}
          className={inputCls}>
          <option value="">Select branch…</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ssem" className={labelCls}>Year & semester</label>
        <select id="ssem" required value={semester}
          onChange={(e) => setSemester(e.target.value === "" ? "" : Number(e.target.value))}
          className={inputCls}>
          <option value="">Select…</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s}>
              Year {Math.ceil(s / 2)} — Semester {s}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={saving}
          className="cursor-pointer rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
          {saving ? "Adding…" : "Add subject"}
        </button>
      </div>
    </form>
  );
}
