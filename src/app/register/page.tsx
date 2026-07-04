"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Branch = { id: number; name: string; code: string };
type Role = "student" | "faculty" | "hod";

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";
const labelCls = "block text-sm font-medium text-slate-700";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [role, setRole] = useState<Role>("student");
  const [branches, setBranches] = useState<Branch[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [roll, setRoll] = useState("");
  const [branchId, setBranchId] = useState<number | "">("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase
      .from("branches")
      .select("id, name, code")
      .order("name")
      .then(({ data }) => setBranches(data ?? []));
  }, [supabase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (branchId === "") {
        throw new Error("Please select your department / branch.");
      }
      let metadata: Record<string, unknown> = {
        role,
        full_name: fullName.trim(),
        branch_id: String(branchId),
      };

      if (role === "student") {
        const { data: check, error: rpcErr } = await supabase.rpc(
          "student_identifiers_available",
          { p_enrollment: enrollment.trim(), p_roll: roll.trim() }
        );
        if (rpcErr) throw new Error(rpcErr.message);
        if (check?.enrollment_taken)
          throw new Error("This enrollment number is already registered.");
        if (check?.roll_taken)
          throw new Error("This roll number is already registered.");
        metadata = {
          ...metadata,
          enrollment_no: enrollment.trim(),
          roll_no: roll.trim(),
        };
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpErr) throw new Error(signUpErr.message);

      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        setDone(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to
            activate your account, then sign in.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700"
          >
            Go to sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">
          Join the GBPIET Portal as a student, faculty member, or head of
          department.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1" role="tablist">
          {(["student", "faculty", "hod"] as const).map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={role === r}
              onClick={() => setRole(r)}
              className={`cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition-colors duration-200 ${
                role === r
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r === "hod" ? "HOD" : r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className={labelCls}>Full name</label>
            <input id="name" required minLength={2} value={fullName}
              onChange={(e) => setFullName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>
              {role === "faculty"
                ? "Institute email"
                : role === "hod"
                ? "Email (Gmail or institute)"
                : "Email (personal or institute)"}
            </label>
            <input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            {role === "faculty" && (
              <p className="mt-1 text-xs text-slate-500">
                Faculty must register with their institute email ID.
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>Password</label>
            <input id="password" type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
          </div>

          {role === "student" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="enrollment" className={labelCls}>Enrollment number</label>
                <input id="enrollment" required value={enrollment}
                  onChange={(e) => setEnrollment(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label htmlFor="roll" className={labelCls}>Roll number</label>
                <input id="roll" required value={roll}
                  onChange={(e) => setRoll(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="branch" className={labelCls}>
              {role === "student" ? "Branch" : "Department"}
            </label>
            <select id="branch" required value={branchId}
              onChange={(e) => setBranchId(e.target.value === "" ? "" : Number(e.target.value))}
              className={inputCls}>
              <option value="">Select…</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {role === "student" && (
              <p className="mt-1 text-xs text-slate-500">
                Your semester placement happens when you fill the semester
                registration form published by your HOD.
              </p>
            )}
            {role === "hod" && (
              <p className="mt-1 text-xs text-slate-500">
                One HOD account per department.
              </p>
            )}
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full cursor-pointer rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Creating account…" : `Register as ${role === "hod" ? "HOD" : role}`}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
