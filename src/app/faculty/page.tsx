import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { classroomLabel } from "@/lib/utils";
import { Empty } from "@/components/ui";

type SubjectCard = {
  id: string;
  name: string;
  code: string;
  is_lab: boolean;
  kind: string;
  label: string;
  enrolled: number;
  passCount: number;
  failCount: number;
  completed: boolean;
};

export default async function FacultyDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subjects } = await supabase
    .from("subjects")
    .select(
      "id, name, code, is_lab, kind, plan_id, classroom_id, semester_plans(status), classrooms(year, semester, branches(name))"
    )
    .eq("faculty_id", user!.id)
    .order("created_at", { ascending: false });

  // Only legacy subjects or subjects on a published plan are teachable.
  const visible = (subjects ?? []).filter((s) => {
    const plan = s.semester_plans as unknown as { status: string } | null;
    return !s.plan_id || plan?.status === "published";
  });

  const ids = visible.map((s) => s.id);
  const [{ data: enrollments }, { data: finalAssessments }, { data: attempts }] =
    ids.length
      ? await Promise.all([
          supabase.from("subject_enrollments").select("subject_id, student_id").in("subject_id", ids),
          supabase
            .from("assessments")
            .select("id, subject_id")
            .in("subject_id", ids)
            .eq("type", "final"),
          supabase
            .from("final_attempts")
            .select("subject_id, student_id, passed")
            .in("subject_id", ids),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

  const finalIds = (finalAssessments ?? []).map((a) => a.id);
  const { data: finalMarks } = finalIds.length
    ? await supabase
        .from("marks")
        .select("assessment_id, student_id, passed")
        .in("assessment_id", finalIds)
    : { data: [] };

  const finalBySubject = new Map((finalAssessments ?? []).map((a) => [a.subject_id, a.id]));
  const enrolledBySubject = new Map<string, string[]>();
  for (const e of enrollments ?? []) {
    const list = enrolledBySubject.get(e.subject_id) ?? [];
    list.push(e.student_id);
    enrolledBySubject.set(e.subject_id, list);
  }

  const cards: SubjectCard[] = visible.map((s) => {
    const c = s.classrooms as unknown as {
      year: number;
      semester: number;
      branches: { name: string };
    };
    const enrolled = enrolledBySubject.get(s.id) ?? [];
    const finalId = finalBySubject.get(s.id);
    const marksForFinal = (finalMarks ?? []).filter((m) => m.assessment_id === finalId);
    const subjectAttempts = (attempts ?? []).filter((a) => a.subject_id === s.id);

    const passedStudents = new Set<string>();
    const failedStudents = new Set<string>();
    for (const m of marksForFinal) {
      if (m.passed) passedStudents.add(m.student_id);
      else failedStudents.add(m.student_id);
    }
    for (const a of subjectAttempts) {
      if (a.passed) {
        passedStudents.add(a.student_id);
        failedStudents.delete(a.student_id);
      }
    }

    const completed =
      !!finalId && enrolled.length > 0 && marksForFinal.length >= enrolled.length;

    return {
      id: s.id,
      name: s.name,
      code: s.code,
      is_lab: s.is_lab,
      kind: s.kind,
      label: classroomLabel(c.branches.name, c.year, c.semester),
      enrolled: enrolled.length,
      passCount: passedStudents.size,
      failCount: failedStudents.size,
      completed,
    };
  });

  const active = cards.filter((c) => !c.completed);
  const completed = cards.filter((c) => c.completed);

  const cardEl = (s: SubjectCard) => (
    <Link
      key={s.id}
      href={`/faculty/subjects/${s.id}`}
      className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-colors duration-200 hover:border-indigo-300 hover:bg-indigo-50/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-slate-900 group-hover:text-indigo-700">
          {s.name}
        </p>
        {s.is_lab && (
          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
            Lab
          </span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-slate-500">{s.code}</p>
      <p className="mt-3 text-xs font-medium text-slate-500">{s.label}</p>
      <p className="mt-1 text-xs text-slate-500">{s.enrolled} students registered</p>
      {(s.passCount > 0 || s.failCount > 0) && (
        <p className="mt-2 text-xs font-medium">
          <span className="text-emerald-700">{s.passCount} passed</span>
          <span className="mx-1 text-slate-400">·</span>
          <span className={s.failCount > 0 ? "text-rose-600" : "text-slate-500"}>
            {s.failCount} failed
          </span>
        </p>
      )}
      <p className="mt-3 text-sm font-medium text-indigo-600">
        Attendance, marks & students →
      </p>
    </Link>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Subjects & Labs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Assigned to you by your HOD through published semester plans.
        </p>
      </div>

      {active.length === 0 ? (
        <Empty>
          No active subjects. When your HOD publishes a semester plan that
          assigns subjects or labs to you, they appear here.
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map(cardEl)}
        </div>
      )}

      {completed.length > 0 && (
        <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer items-center justify-between px-5 py-4">
            <span className="font-semibold text-slate-900">
              Completed subjects ({completed.length})
            </span>
            <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
              className="h-4 w-4 text-slate-500 transition-transform duration-200 group-open:rotate-180">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </summary>
          <div className="grid gap-4 border-t border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map(cardEl)}
          </div>
        </details>
      )}
    </div>
  );
}
