import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Classrooms" };

export default async function ClassroomsPage() {
  const supabase = await createClient();

  const [{ data: branches }, { data: classrooms }, { data: students }] =
    await Promise.all([
      supabase.from("branches").select("id, name, code").order("name"),
      supabase.from("classrooms").select("id, branch_id, year, semester"),
      supabase.from("students").select("id, classroom_id").eq("status", "active"),
    ]);

  const counts = new Map<number, number>();
  for (const s of students ?? []) {
    if (s.classroom_id)
      counts.set(s.classroom_id, (counts.get(s.classroom_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Classrooms</h1>
        <p className="mt-1 text-sm text-slate-600">
          Every branch, year, and semester. Open a classroom to see its
          students and subjects.
        </p>
      </div>

      {(branches ?? []).map((b) => (
        <section key={b.id}>
          <h2 className="text-base font-semibold text-slate-900">{b.name}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(classrooms ?? [])
              .filter((c) => c.branch_id === b.id)
              .sort((x, y) => x.semester - y.semester)
              .map((c) => (
                <Link
                  key={c.id}
                  href={`/faculty/classrooms/${c.id}`}
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
