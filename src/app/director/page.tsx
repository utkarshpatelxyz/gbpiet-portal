import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Stat } from "@/components/ui";

export default async function DirectorDashboard() {
  const supabase = await createClient();

  const [
    { data: branches },
    { data: classrooms },
    { data: students },
    { count: facultyCount },
    { count: subjectCount },
  ] = await Promise.all([
    supabase.from("branches").select("id, name, code").order("name"),
    supabase.from("classrooms").select("id, branch_id, year, semester"),
    supabase.from("students").select("id, classroom_id, status"),
    supabase.from("faculty").select("id", { count: "exact", head: true }),
    supabase.from("subjects").select("id", { count: "exact", head: true }),
  ]);

  const active = (students ?? []).filter((s) => s.status === "active");
  const counts = new Map<number, number>();
  for (const s of active) {
    if (s.classroom_id)
      counts.set(s.classroom_id, (counts.get(s.classroom_id) ?? 0) + 1);
  }
  const branchCounts = new Map<number, number>();
  for (const c of classrooms ?? []) {
    branchCounts.set(
      c.branch_id,
      (branchCounts.get(c.branch_id) ?? 0) + (counts.get(c.id) ?? 0)
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Institute Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          G.B. Pant Institute of Engineering and Technology — live figures
          across every branch and classroom.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Active students" value={active.length} />
        <Stat label="Faculty members" value={facultyCount ?? 0} />
        <Stat label="Branches" value={(branches ?? []).length} />
        <Stat label="Subjects running" value={subjectCount ?? 0} />
      </div>

      {(branches ?? []).map((b) => (
        <section key={b.id}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-slate-900">{b.name}</h2>
            <span className="text-sm text-slate-500">
              {branchCounts.get(b.id) ?? 0} students
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(classrooms ?? [])
              .filter((c) => c.branch_id === b.id)
              .sort((x, y) => x.semester - y.semester)
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/director/classrooms/${c.id}`}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700">
                    Year {c.year} · Semester {c.semester}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {counts.get(c.id) ?? 0} students
                  </p>
                </Link>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
