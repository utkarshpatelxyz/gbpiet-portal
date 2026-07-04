import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { classroomLabel } from "@/lib/utils";
import { Card, Empty } from "@/components/ui";
import CreateSubject from "./create-subject";

export default async function FacultyDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, code, classrooms(year, semester, branches(name))")
    .eq("faculty_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Subjects</h1>
        <p className="mt-1 text-sm text-slate-600">
          Subjects you teach. Students in the target classroom see a subject
          the moment you add it.
        </p>
      </div>

      <Card title="Add a subject">
        <CreateSubject />
      </Card>

      {(subjects ?? []).length === 0 ? (
        <Empty>You have not added any subjects yet.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(subjects ?? []).map((s) => {
            const c = s.classrooms as unknown as {
              year: number;
              semester: number;
              branches: { name: string };
            };
            return (
              <Link
                key={s.id}
                href={`/faculty/subjects/${s.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-50/40"
              >
                <p className="font-semibold text-slate-900 group-hover:text-indigo-700">
                  {s.name}
                </p>
                <p className="mt-0.5 text-sm text-slate-500">{s.code}</p>
                <p className="mt-3 text-xs font-medium text-slate-500">
                  {classroomLabel(c.branches.name, c.year, c.semester)}
                </p>
                <p className="mt-3 text-sm font-medium text-indigo-600">
                  Attendance, marks & students →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
