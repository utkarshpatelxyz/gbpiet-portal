import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classroomLabel, pct } from "@/lib/utils";
import { Card, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";

export default async function DirectorClassroom({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const classroomId = Number(id);
  if (Number.isNaN(classroomId)) notFound();

  const supabase = await createClient();
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, year, semester, branches(name, code)")
    .eq("id", classroomId)
    .maybeSingle();
  if (!classroom) notFound();
  const branch = classroom.branches as unknown as { name: string; code: string };

  const [{ data: students }, { data: subjects }] = await Promise.all([
    supabase
      .from("students")
      .select("id, enrollment_no, roll_no, profiles(full_name)")
      .eq("classroom_id", classroomId)
      .eq("status", "active")
      .order("roll_no"),
    supabase
      .from("subjects")
      .select("id, name, code, faculty:faculty_id(profiles(full_name))")
      .eq("classroom_id", classroomId)
      .order("created_at"),
  ]);

  const subjectIds = (subjects ?? []).map((s) => s.id);

  // Attendance statistics per subject (finalized sessions only).
  const { data: sessions } = subjectIds.length
    ? await supabase
        .from("attendance_sessions")
        .select("id, subject_id")
        .in("subject_id", subjectIds)
        .eq("status", "finalized")
    : { data: [] };
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: records } = sessionIds.length
    ? await supabase
        .from("attendance_records")
        .select("session_id, final_status")
        .in("session_id", sessionIds)
    : { data: [] };
  const sessionSubject = new Map((sessions ?? []).map((s) => [s.id, s.subject_id]));
  const attStats = new Map<string, { present: number; total: number; sessions: Set<string> }>();
  for (const r of records ?? []) {
    const subjectId = sessionSubject.get(r.session_id)!;
    const cur =
      attStats.get(subjectId) ?? { present: 0, total: 0, sessions: new Set<string>() };
    cur.total += 1;
    cur.sessions.add(r.session_id);
    if (r.final_status === "present") cur.present += 1;
    attStats.set(subjectId, cur);
  }

  // Marks summaries per assessment.
  const { data: assessments } = subjectIds.length
    ? await supabase
        .from("assessments")
        .select("id, title, type, max_marks, subject_id")
        .in("subject_id", subjectIds)
    : { data: [] };
  const assessmentIds = (assessments ?? []).map((a) => a.id);
  const { data: marks } = assessmentIds.length
    ? await supabase
        .from("marks")
        .select("assessment_id, marks_obtained, passed")
        .in("assessment_id", assessmentIds)
    : { data: [] };
  const markStats = new Map<string, { sum: number; n: number; fails: number }>();
  for (const m of marks ?? []) {
    const cur = markStats.get(m.assessment_id) ?? { sum: 0, n: 0, fails: 0 };
    cur.sum += Number(m.marks_obtained);
    cur.n += 1;
    if (m.passed === false) cur.fails += 1;
    markStats.set(m.assessment_id, cur);
  }
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, `${s.name} (${s.code})`]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/director" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {classroomLabel(branch.name, classroom.year, classroom.semester)}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {(students ?? []).length} students · {(subjects ?? []).length} subjects
        </p>
      </div>

      <Card
        title="Students"
        action={
          (students ?? []).length > 0 ? (
            <CsvButton
              filename={`students-${branch.code}-S${classroom.semester}`}
              headers={["Roll No", "Enrollment No", "Name"]}
              rows={(students ?? []).map((st) => [
                st.roll_no,
                st.enrollment_no,
                (st.profiles as unknown as { full_name: string }).full_name,
              ])}
              label="Student list"
            />
          ) : undefined
        }
      >
        {(students ?? []).length === 0 ? (
          <Empty>No students in this classroom.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Roll No</Th>
                  <Th>Enrollment No</Th>
                  <Th>Name</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(students ?? []).map((st) => (
                  <tr key={st.id}>
                    <Td>{st.roll_no}</Td>
                    <Td>{st.enrollment_no}</Td>
                    <Td>
                      <span className="font-medium text-slate-900">
                        {(st.profiles as unknown as { full_name: string }).full_name}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Subjects & attendance statistics">
        {(subjects ?? []).length === 0 ? (
          <Empty>No subjects assigned yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Subject</Th>
                  <Th>Faculty</Th>
                  <Th>Sessions held</Th>
                  <Th>Average attendance</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(subjects ?? []).map((s) => {
                  const fac = s.faculty as unknown as { profiles: { full_name: string } } | null;
                  const st = attStats.get(s.id);
                  const p = st ? pct(st.present, st.total) : null;
                  return (
                    <tr key={s.id}>
                      <Td>
                        <span className="font-medium text-slate-900">
                          {s.name} ({s.code})
                        </span>
                      </Td>
                      <Td>{fac?.profiles?.full_name ?? "—"}</Td>
                      <Td>{st ? st.sessions.size : 0}</Td>
                      <Td>
                        {p === null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className={`font-semibold ${p < 75 ? "text-rose-600" : "text-emerald-700"}`}>
                            {p}%
                          </span>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Marks summary">
        {(assessments ?? []).length === 0 ? (
          <Empty>No assessments created yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Subject</Th>
                  <Th>Assessment</Th>
                  <Th>Type</Th>
                  <Th>Entries</Th>
                  <Th>Average</Th>
                  <Th>Fails</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(assessments ?? []).map((a) => {
                  const st = markStats.get(a.id);
                  return (
                    <tr key={a.id}>
                      <Td>{subjectName.get(a.subject_id)}</Td>
                      <Td>
                        <span className="font-medium text-slate-900">{a.title}</span>
                      </Td>
                      <Td>{a.type === "final" ? "Final exam" : "Class test"}</Td>
                      <Td>{st?.n ?? 0}</Td>
                      <Td>
                        {st && st.n > 0
                          ? `${Math.round((st.sum / st.n) * 10) / 10} / ${a.max_marks}`
                          : "—"}
                      </Td>
                      <Td>
                        {a.type === "final" ? (
                          <span className={st && st.fails > 0 ? "font-semibold text-rose-600" : ""}>
                            {st?.fails ?? 0}
                          </span>
                        ) : (
                          "—"
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
