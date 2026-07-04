import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Chip, Empty } from "@/components/ui";
import NewPlan from "./new-plan";

export const metadata = { title: "Semester Plans" };

export default async function PlansPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: hod } = await supabase
    .from("hods")
    .select("branch_id, branches(name)")
    .eq("id", user!.id)
    .single();
  if (!hod) return <Empty>Your HOD record could not be loaded.</Empty>;

  const { data: plans } = await supabase
    .from("semester_plans")
    .select("id, semester, status, published_at")
    .eq("branch_id", hod.branch_id)
    .order("semester");

  const { data: subjects } = (plans ?? []).length
    ? await supabase
        .from("subjects")
        .select("id, plan_id")
        .in("plan_id", (plans ?? []).map((p) => p.id))
    : { data: [] };
  const countByPlan = new Map<string, number>();
  for (const s of subjects ?? []) {
    if (s.plan_id) countByPlan.set(s.plan_id, (countByPlan.get(s.plan_id) ?? 0) + 1);
  }

  const usedSemesters = (plans ?? []).map((p) => p.semester);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Semester Plans</h1>
        <p className="mt-1 text-sm text-slate-600">
          {(hod.branches as unknown as { name: string }).name} — build the
          subject plan for an upcoming semester, then publish it to open
          student registration.
        </p>
      </div>

      <NewPlan usedSemesters={usedSemesters} />

      {(plans ?? []).length === 0 ? (
        <Empty>No semester plans yet. Create one above.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(plans ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/hod/plans/${p.id}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-50/40"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900 group-hover:text-indigo-700">
                  Semester {p.semester}
                </p>
                <Chip
                  kind={p.status === "published" ? "approved" : "pending"}
                  label={p.status === "published" ? "Published" : "Draft"}
                />
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {countByPlan.get(p.id) ?? 0} subjects & labs
              </p>
              <p className="mt-3 text-sm font-medium text-indigo-600">
                {p.status === "published" ? "View / edit →" : "Continue planning →"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
