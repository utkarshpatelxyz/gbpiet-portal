import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { classroomLabel, formatDate, pct } from "@/lib/utils";
import { Card, Chip, Empty, Stat, Th, Td } from "@/components/ui";
import SelfMark from "./self-mark";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, enrollment_no, roll_no, status, branch_id, classroom_id, branches(name, code), classrooms(id, year, semester)"
    )
    .eq("id", user!.id)
    .single();

  if (!student) {
    return <Empty>Your student record could not be loaded.</Empty>;
  }

  const branch = student.branches as unknown as { name: string; code: string };
  const classroom = student.classrooms as unknown as {
    id: number;
    year: number;
    semester: number;
  } | null;

  if (student.status === "graduated") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h1 className="text-2xl font-bold text-emerald-800">
          Congratulations — you have graduated!
        </h1>
        <p className="mt-2 text-sm text-emerald-700">
          Your full academic history remains available under Attendance and Marks.
        </p>
      </div>
    );
  }

  // Published plan for my next semester that I have not registered for yet.
  const nextSemester = classroom ? classroom.semester + 1 : 1;
  const { data: nextPlan } =
    nextSemester <= 8
      ? await supabase
          .from("semester_plans")
          .select("id, semester")
          .eq("branch_id", student.branch_id)
          .eq("semester", nextSemester)
          .eq("status", "published")
          .maybeSingle()
      : { data: null };
  let registrationOpen = false;
  if (nextPlan) {
    const { data: reg } = await supabase
      .from("semester_registrations")
      .select("id")
      .eq("student_id", user!.id)
      .eq("plan_id", nextPlan.id)
      .maybeSingle();
    registrationOpen = !reg;
  }

  // My enrolled subjects for the current semester.
  const { data: enrollments } = await supabase
    .from("subject_enrollments")
    .select(
      "subject_id, subjects(id, name, code, is_lab, classroom_id, faculty_id, faculty:faculty_id(profiles(full_name)))"
    )
    .eq("student_id", user!.id);

  const currentSubjects = (enrollments ?? [])
    .map((e) => e.subjects as unknown as {
      id: string;
      name: string;
      code: string;
      is_lab: boolean;
      classroom_id: number;
      faculty_id: string;
      faculty: { profiles: { full_name: string } } | null;
    })
    .filter((s) => classroom && s.classroom_id === classroom.id);

  const subjectIds = currentSubjects.map((s) => s.id);

  const { data: openSessions } = subjectIds.length
    ? await supabase
        .from("attendance_sessions")
        .select("id, session_date, subject_id, subjects(name, code, is_lab)")
        .in("subject_id", subjectIds)
        .eq("status", "open")
        .order("session_date", { ascending: false })
    : { data: [] };

  const sessionIds = (openSessions ?? []).map((s) => s.id);
  const { data: myMarks } = sessionIds.length
    ? await supabase
        .from("attendance_records")
        .select("session_id, self_status")
        .in("session_id", sessionIds)
        .eq("student_id", user!.id)
    : { data: [] };
  const selfBySession = new Map(
    (myMarks ?? []).map((r) => [r.session_id, r.self_status])
  );

  const { data: finals } = subjectIds.length
    ? await supabase
        .from("attendance_records")
        .select("final_status, attendance_sessions!inner(subject_id)")
        .eq("student_id", user!.id)
        .not("final_status", "is", null)
    : { data: [] };
  const attBySubject = new Map<string, { present: number; total: number }>();
  for (const r of finals ?? []) {
    const sess = r.attendance_sessions as unknown as { subject_id: string };
    if (!subjectIds.includes(sess.subject_id)) continue;
    const cur = attBySubject.get(sess.subject_id) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (r.final_status === "present") cur.present += 1;
    attBySubject.set(sess.subject_id, cur);
  }

  const { data: backlogs } = await supabase
    .from("backlogs")
    .select("id, status, subjects(name, code)")
    .eq("student_id", user!.id)
    .eq("status", "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          {classroom
            ? classroomLabel(branch.name, classroom.year, classroom.semester)
            : `${branch.name} — not registered into a semester yet`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Enrollment No." value={<span className="text-xl">{student.enrollment_no}</span>} />
        <Stat label="Roll No." value={<span className="text-xl">{student.roll_no}</span>} />
        <Stat label="Subjects this semester" value={currentSubjects.length} />
      </div>

      {registrationOpen && nextPlan && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div>
            <h2 className="font-semibold text-indigo-900">
              Semester {nextPlan.semester} registration is open
            </h2>
            <p className="mt-1 text-sm text-indigo-800">
              Your HOD has published the Semester {nextPlan.semester} subject
              plan. Complete the registration form to move into the new
              semester.
            </p>
          </div>
          <Link
            href="/student/register-semester"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700"
          >
            Fill registration form →
          </Link>
        </div>
      )}

      {!classroom && !registrationOpen && (
        <Empty>
          You are not registered into a semester yet. The registration form
          will appear here as soon as your HOD publishes the Semester 1 plan.
        </Empty>
      )}

      {(openSessions ?? []).length > 0 && (
        <Card title="Attendance now open — mark yourself">
          <ul className="divide-y divide-slate-100">
            {(openSessions ?? []).map((s) => {
              const subj = s.subjects as unknown as { name: string; code: string; is_lab: boolean };
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {subj.name}{" "}
                      <span className="font-normal text-slate-500">({subj.code})</span>
                      {subj.is_lab && (
                        <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                          Lab
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(s.session_date)}</p>
                  </div>
                  <SelfMark
                    sessionId={s.id}
                    current={(selfBySession.get(s.id) as "present" | "on_leave" | undefined) ?? null}
                  />
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Your self-mark is advisory. Your teacher verifies physically and
            finalizes the official record.
          </p>
        </Card>
      )}

      {classroom && (
        <Card title="My subjects & labs">
          {currentSubjects.length === 0 ? (
            <Empty>No subjects for this semester yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <Th>Subject</Th>
                    <Th>Code</Th>
                    <Th>Faculty</Th>
                    <Th>Attendance</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentSubjects.map((s) => {
                    const att = attBySubject.get(s.id);
                    const p = att ? pct(att.present, att.total) : null;
                    return (
                      <tr key={s.id}>
                        <Td>
                          <span className="font-medium text-slate-900">{s.name}</span>
                          {s.is_lab && (
                            <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                              Lab
                            </span>
                          )}
                        </Td>
                        <Td>{s.code}</Td>
                        <Td>
                          <Link
                            href={`/faculty-profile/${s.faculty_id}`}
                            className="text-indigo-600 hover:text-indigo-700"
                          >
                            {s.faculty?.profiles?.full_name ?? "—"}
                          </Link>
                        </Td>
                        <Td>
                          {p === null ? (
                            <span className="text-slate-400">No sessions yet</span>
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
      )}

      {(backlogs ?? []).length > 0 && (
        <Card title="Pending backlogs">
          <ul className="space-y-2">
            {(backlogs ?? []).map((b) => {
              const subj = b.subjects as unknown as { name: string; code: string };
              return (
                <li key={b.id} className="flex items-center justify-between rounded-lg bg-rose-50 px-4 py-2.5">
                  <span className="text-sm font-medium text-rose-800">
                    {subj.name} ({subj.code})
                  </span>
                  <Chip kind="fail" label="Backlog — re-appear required" />
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
