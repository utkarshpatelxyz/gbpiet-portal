import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classroomLabel, formatDate } from "@/lib/utils";
import { Card, Chip, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";
import NewSession from "./new-session";
import NewAssessment from "./new-assessment";
import Reappearance from "./reappearance";

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
    .select(
      "id, name, code, is_lab, plan_id, faculty_id, classroom_id, classrooms(year, semester, branches(name, code))"
    )
    .eq("id", id)
    .maybeSingle();
  if (!subject || subject.faculty_id !== user!.id) notFound();

  const classroom = subject.classrooms as unknown as {
    year: number;
    semester: number;
    branches: { name: string; code: string };
  };

  // Roster: enrolled students for plan subjects, classroom students for legacy.
  let students: {
    id: string;
    enrollment_no: string;
    roll_no: string;
    full_name: string;
  }[] = [];
  if (subject.plan_id) {
    const { data } = await supabase
      .from("subject_enrollments")
      .select("students(id, enrollment_no, roll_no, profiles(full_name))")
      .eq("subject_id", id);
    students = (data ?? [])
      .map((e) => {
        const st = e.students as unknown as {
          id: string;
          enrollment_no: string;
          roll_no: string;
          profiles: { full_name: string };
        };
        return {
          id: st.id,
          enrollment_no: st.enrollment_no,
          roll_no: st.roll_no,
          full_name: st.profiles.full_name,
        };
      })
      .sort((a, b) => a.roll_no.localeCompare(b.roll_no));
  } else {
    const { data } = await supabase
      .from("students")
      .select("id, enrollment_no, roll_no, profiles(full_name)")
      .eq("classroom_id", subject.classroom_id)
      .eq("status", "active")
      .order("roll_no");
    students = (data ?? []).map((st) => ({
      id: st.id,
      enrollment_no: st.enrollment_no,
      roll_no: st.roll_no,
      full_name: (st.profiles as unknown as { full_name: string }).full_name,
    }));
  }

  const [{ data: sessions }, { data: assessments }, { data: attempts }] =
    await Promise.all([
      supabase
        .from("attendance_sessions")
        .select("id, session_date, status")
        .eq("subject_id", id)
        .order("session_date", { ascending: false }),
      supabase
        .from("assessments")
        .select("id, title, type, max_marks, passing_marks, created_at")
        .eq("subject_id", id)
        .order("created_at"),
      supabase
        .from("final_attempts")
        .select("id, student_id, max_marks, passing_marks, marks_obtained, passed, created_at")
        .eq("subject_id", id)
        .order("created_at"),
    ]);

  const finalAssessment = (assessments ?? []).find((a) => a.type === "final");

  const { data: allMarks } = (assessments ?? []).length
    ? await supabase
        .from("marks")
        .select("assessment_id, student_id, marks_obtained, passed")
        .in("assessment_id", (assessments ?? []).map((a) => a.id))
    : { data: [] };

  // Pass/fail summary from the final exam + re-appearance attempts.
  const finalMarks = (allMarks ?? []).filter(
    (m) => finalAssessment && m.assessment_id === finalAssessment.id
  );
  const passedStudents = new Set<string>();
  const failedStudents = new Set<string>();
  for (const m of finalMarks) {
    if (m.passed) passedStudents.add(m.student_id);
    else failedStudents.add(m.student_id);
  }
  for (const a of attempts ?? []) {
    if (a.passed) {
      passedStudents.add(a.student_id);
      failedStudents.delete(a.student_id);
    }
  }
  const pendingReappearance = students.filter((st) => failedStudents.has(st.id));

  // CSV: attendance register.
  const finalized = (sessions ?? [])
    .filter((s) => s.status === "finalized")
    .sort((a, b) => a.session_date.localeCompare(b.session_date));
  const { data: allRecords } = finalized.length
    ? await supabase
        .from("attendance_records")
        .select("session_id, student_id, final_status")
        .in("session_id", finalized.map((s) => s.id))
    : { data: [] };
  const recMap = new Map(
    (allRecords ?? []).map((r) => [`${r.session_id}:${r.student_id}`, r.final_status])
  );
  const registerHeaders = [
    "Roll No", "Enrollment No", "Name",
    ...finalized.map((s) => s.session_date),
    "Present", "Total", "%",
  ];
  const registerRows = students.map((st) => {
    const cells = finalized.map((s) => {
      const v = recMap.get(`${s.id}:${st.id}`);
      return v === "present" ? "P" : v === "absent" ? "A" : v === "on_leave" ? "L" : "";
    });
    const present = cells.filter((c) => c === "P").length;
    const total = cells.filter((c) => c !== "").length;
    return [st.roll_no, st.enrollment_no, st.full_name, ...cells, present, total,
      total ? Math.round((present / total) * 1000) / 10 : ""];
  });

  // CSV: marks sheet (assessments + re-appearance attempts).
  const markMap = new Map(
    (allMarks ?? []).map((m) => [`${m.assessment_id}:${m.student_id}`, m])
  );
  const marksHeaders = [
    "Roll No", "Enrollment No", "Name",
    ...(assessments ?? []).flatMap((a) => [`${a.title} (/${a.max_marks}, pass ${a.passing_marks})`, `${a.title} Result`]),
    "Re-appearance attempts",
  ];
  const attemptsByStudent = new Map<string, NonNullable<typeof attempts>>();
  for (const a of attempts ?? []) {
    const list = attemptsByStudent.get(a.student_id) ?? [];
    list.push(a);
    attemptsByStudent.set(a.student_id, list);
  }
  const marksRows = students.map((st) => {
    const cells = (assessments ?? []).flatMap((a) => {
      const m = markMap.get(`${a.id}:${st.id}`);
      return [m ? m.marks_obtained : "", m ? (m.passed ? "PASSED" : "FAILED") : ""];
    });
    const attemptStr = (attemptsByStudent.get(st.id) ?? [])
      .map((a, i) => `Attempt ${i + 1}: ${a.marks_obtained}/${a.max_marks} (pass ${a.passing_marks}) ${a.passed ? "PASSED" : "FAILED"}`)
      .join("; ");
    return [st.roll_no, st.enrollment_no, st.full_name, ...cells, attemptStr];
  });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/faculty" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← My subjects
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {subject.name}{" "}
          <span className="text-lg font-medium text-slate-500">({subject.code})</span>
          {subject.is_lab && (
            <span className="ml-2 align-middle rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
              Lab
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {classroomLabel(classroom.branches.name, classroom.year, classroom.semester)} ·{" "}
          {students.length} registered students
          {finalAssessment && (
            <>
              {" · "}
              <span className="font-medium text-emerald-700">{passedStudents.size} passed</span>
              {" / "}
              <span className={failedStudents.size > 0 ? "font-medium text-rose-600" : ""}>
                {failedStudents.size} failed
              </span>{" "}
              (final exam)
            </>
          )}
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
        <NewAssessment subjectId={subject.id} hasFinal={!!finalAssessment} />
        {(assessments ?? []).length > 0 && (
          <ul className="mt-5 divide-y divide-slate-100">
            {(assessments ?? []).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-900">{a.title}</span>
                  <span className="text-xs text-slate-500">
                    {a.type === "final" ? "Final exam" : "Class test"} · max {a.max_marks} ·
                    pass {a.passing_marks}
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

      {(pendingReappearance.length > 0 || (attempts ?? []).length > 0) && (
        <Card title="Re-appearance (backlog) attempts">
          {(attempts ?? []).length > 0 && (
            <div className="mb-5 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <Th>Student</Th>
                    <Th>Date</Th>
                    <Th>Marks</Th>
                    <Th>Passing</Th>
                    <Th>Result</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(attempts ?? []).map((a) => {
                    const st = students.find((s) => s.id === a.student_id);
                    return (
                      <tr key={a.id}>
                        <Td>
                          <span className="font-medium text-slate-900">
                            {st?.full_name ?? "Former student"}
                          </span>
                        </Td>
                        <Td>{formatDate(a.created_at)}</Td>
                        <Td>{a.marks_obtained} / {a.max_marks}</Td>
                        <Td>{a.passing_marks}</Td>
                        <Td>
                          {a.passed ? <Chip kind="pass" label="Passed" /> : <Chip kind="fail" label="Failed" />}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pendingReappearance.length > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                These students failed the final exam and have not yet passed a
                re-appearance. Enter their new attempt with fresh maximum and
                passing marks — previous marks are never overwritten.
              </p>
              {pendingReappearance.map((st) => (
                <Reappearance
                  key={st.id}
                  subjectId={subject.id}
                  studentId={st.id}
                  studentName={`${st.full_name} (Roll ${st.roll_no})`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-700">
              No students are pending re-appearance for this subject.
            </p>
          )}
        </Card>
      )}

      <Card title="Registered students" action={
        students.length > 0 ? (
          <CsvButton
            filename={`students-${subject.code}`}
            headers={["Roll No", "Enrollment No", "Name"]}
            rows={students.map((st) => [st.roll_no, st.enrollment_no, st.full_name])}
            label="Student list"
          />
        ) : undefined
      }>
        {students.length === 0 ? (
          <Empty>No students have registered for this subject yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Roll No</Th>
                  <Th>Enrollment No</Th>
                  <Th>Name</Th>
                  {finalAssessment && <Th>Final result</Th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => (
                  <tr key={st.id}>
                    <Td>{st.roll_no}</Td>
                    <Td>{st.enrollment_no}</Td>
                    <Td>
                      <span className="font-medium text-slate-900">{st.full_name}</span>
                    </Td>
                    {finalAssessment && (
                      <Td>
                        {passedStudents.has(st.id) ? (
                          <Chip kind="pass" label="Passed" />
                        ) : failedStudents.has(st.id) ? (
                          <Chip kind="fail" label="Failed — backlog" />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                    )}
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
