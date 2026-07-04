import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classroomLabel, formatDate } from "@/lib/utils";
import { Card, Chip, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";
import NewSession from "./new-session";
import NewAssessment from "./new-assessment";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, code, faculty_id, classroom_id, classrooms(year, semester, branches(name, code))")
    .eq("id", id)
    .maybeSingle();
  if (!subject || subject.faculty_id !== user!.id) notFound();

  const classroom = subject.classrooms as unknown as {
    year: number;
    semester: number;
    branches: { name: string; code: string };
  };

  const [{ data: students }, { data: sessions }, { data: assessments }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id, enrollment_no, roll_no, profiles(full_name)")
        .eq("classroom_id", subject.classroom_id)
        .eq("status", "active")
        .order("roll_no"),
      supabase
        .from("attendance_sessions")
        .select("id, session_date, status")
        .eq("subject_id", id)
        .order("session_date", { ascending: false }),
      supabase
        .from("assessments")
        .select("id, title, type, max_marks, created_at")
        .eq("subject_id", id)
        .order("created_at"),
    ]);

  const finalizedIds = (sessions ?? [])
    .filter((s) => s.status === "finalized")
    .map((s) => s.id);
  const { data: allRecords } = finalizedIds.length
    ? await supabase
        .from("attendance_records")
        .select("session_id, student_id, final_status")
        .in("session_id", finalizedIds)
    : { data: [] };

  const finalized = (sessions ?? [])
    .filter((s) => s.status === "finalized")
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
  const recMap = new Map(
    (allRecords ?? []).map((r) => [`${r.session_id}:${r.student_id}`, r.final_status])
  );
  const registerHeaders = [
    "Roll No",
    "Enrollment No",
    "Name",
    ...finalized.map((s) => s.session_date),
    "Present",
    "Total",
    "%",
  ];
  const registerRows = (students ?? []).map((st) => {
    const prof = st.profiles as unknown as { full_name: string };
    const cells = finalized.map((s) => {
      const v = recMap.get(`${s.id}:${st.id}`);
      return v === "present" ? "P" : v === "absent" ? "A" : v === "on_leave" ? "L" : "";
    });
    const present = cells.filter((c) => c === "P").length;
    const total = cells.filter((c) => c !== "").length;
    return [
      st.roll_no,
      st.enrollment_no,
      prof.full_name,
      ...cells,
      present,
      total,
      total ? Math.round((present / total) * 1000) / 10 : "",
    ];
  });

  const { data: allMarks } = (assessments ?? []).length
    ? await supabase
        .from("marks")
        .select("assessment_id, student_id, marks_obtained, passed")
        .in("assessment_id", (assessments ?? []).map((a) => a.id))
    : { data: [] };
  const markMap = new Map(
    (allMarks ?? []).map((m) => [`${m.assessment_id}:${m.student_id}`, m])
  );
  const marksHeaders = [
    "Roll No",
    "Enrollment No",
    "Name",
    ...(assessments ?? []).flatMap((a) =>
      a.type === "final"
        ? [`${a.title} (/${a.max_marks})`, `${a.title} Result`]
        : [`${a.title} (/${a.max_marks})`]
    ),
  ];
  const marksRows = (students ?? []).map((st) => {
    const prof = st.profiles as unknown as { full_name: string };
    const cells = (assessments ?? []).flatMap((a) => {
      const m = markMap.get(`${a.id}:${st.id}`);
      const base = m ? m.marks_obtained : "";
      if (a.type === "final") {
        return [base, m ? (m.passed === false ? "FAIL" : m.passed === true ? "PASS" : "") : ""];
      }
      return [base];
    });
    return [st.roll_no, st.enrollment_no, prof.full_name, ...cells];
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/faculty" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← My subjects
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {subject.name} <span className="text-lg font-medium text-slate-500">({subject.code})</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {classroomLabel(classroom.branches.name, classroom.year, classroom.semester)} ·{" "}
          {(students ?? []).length} students
        </p>
      </div>

      <Card title="Attendance sessions" action={
        registerRows.length > 0 && finalized.length > 0 ? (
          <CsvButton
            filename={`attendance-register-${subject.code}`}
            headers={registerHeaders}
            rows={registerRows}
            label="Attendance register"
          />
        ) : undefined
      }>
        <NewSession subjectId={subject.id} />
        {(sessions ?? []).length > 0 && (
          <ul className="mt-5 divide-y divide-slate-100">
            {(sessions ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900">
                    {formatDate(s.session_date)}
                  </span>
                  <Chip kind={s.status} label={s.status === "open" ? "Open" : "Finalized"} />
                </div>
                <Link
                  href={`/faculty/subjects/${subject.id}/sessions/${s.id}`}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  {s.status === "open" ? "Verify & finalize →" : "View →"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Assessments & marks" action={
        marksRows.length > 0 && (assessments ?? []).length > 0 ? (
          <CsvButton
            filename={`marks-sheet-${subject.code}`}
            headers={marksHeaders}
            rows={marksRows}
            label="Marks sheet"
          />
        ) : undefined
      }>
        <NewAssessment subjectId={subject.id} />
        {(assessments ?? []).length > 0 && (
          <ul className="mt-5 divide-y divide-slate-100">
            {(assessments ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900">{a.title}</span>
                  <span className="text-xs text-slate-500">
                    {a.type === "final" ? "Final exam" : "Class test"} · {a.max_marks} marks
                  </span>
                </div>
                <Link
                  href={`/faculty/subjects/${subject.id}/marks/${a.id}`}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Enter marks →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Students in this classroom" action={
        (students ?? []).length > 0 ? (
          <CsvButton
            filename={`students-${classroom.branches.code}-S${classroom.semester}`}
            headers={["Roll No", "Enrollment No", "Name"]}
            rows={(students ?? []).map((st) => [
              st.roll_no,
              st.enrollment_no,
              (st.profiles as unknown as { full_name: string }).full_name,
            ])}
            label="Student list"
          />
        ) : undefined
      }>
        {(students ?? []).length === 0 ? (
          <Empty>No students have joined this classroom yet.</Empty>
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
    </div>
  );
}
