import { createClient } from "@/lib/supabase/server";
import { classroomLabel, formatDate, pct } from "@/lib/utils";
import { Card, Chip, Empty, Stat, Th, Td } from "@/components/ui";
import SelfMark from "./self-mark";
import SemesterEndButton from "./semester-end";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select(
      "id, enrollment_no, roll_no, status, classroom_id, classrooms(id, year, semester, branches(name, code))"
    )
    .eq("id", user!.id)
    .single();

  if (!student) {
    return <Empty>Your student record could not be loaded.</Empty>;
  }

  const classroom = student.classrooms as unknown as {
    id: number;
    year: number;
    semester: number;
    branches: { name: string; code: string };
  } | null;

  if (student.status === "graduated" || !classroom) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <h1 className="text-2xl font-bold text-emerald-800">
            Congratulations — you have graduated!
          </h1>
          <p className="mt-2 text-sm text-emerald-700">
            Your full academic history remains available under Attendance and
            Marks.
          </p>
        </div>
      </div>
    );
  }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, code, created_at, faculty:faculty_id(profiles(full_name))")
    .eq("classroom_id", classroom.id)
    .order("created_at");

  const subjectIds = (subjects ?? []).map((s) => s.id);

  const { data: openSessions } = subjectIds.length
    ? await supabase
        .from("attendance_sessions")
        .select("id, session_date, subject_id, subjects(name, code)")
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

  const { data: finals } = await supabase
    .from("attendance_records")
    .select("final_status, attendance_sessions!inner(subject_id, status)")
    .eq("student_id", user!.id)
    .not("final_status", "is", null);

  const attBySubject = new Map<string, { present: number; total: number }>();
  for (const r of finals ?? []) {
    const sess = r.attendance_sessions as unknown as { subject_id: string };
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

  const { data: request } = await supabase
    .from("semester_end_requests")
    .select("id, status, requested_at")
    .eq("student_id", user!.id)
    .eq("classroom_id", classroom.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          {classroomLabel(classroom.branches.name, classroom.year, classroom.semester)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Enrollment No." value={<span className="text-xl">{student.enrollment_no}</span>} />
        <Stat label="Roll No." value={<span className="text-xl">{student.roll_no}</span>} />
        <Stat label="Subjects this semester" value={(subjects ?? []).length} />
      </div>

      {(openSessions ?? []).length > 0 && (
        <Card title="Attendance now open — mark yourself">
          <ul className="divide-y divide-slate-100">
            {(openSessions ?? []).map((s) => {
              const subj = s.subjects as unknown as { name: string; code: string };
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {subj.name} <span className="font-normal text-slate-500">({subj.code})</span>
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

      <Card title="My subjects">
        {(subjects ?? []).length === 0 ? (
          <Empty>
            No subjects yet. Subjects appear here the moment your faculty adds
            them for your classroom.
          </Empty>
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
                {(subjects ?? []).map((s) => {
                  const fac = s.faculty as unknown as { profiles: { full_name: string } } | null;
                  const att = attBySubject.get(s.id);
                  const p = att ? pct(att.present, att.total) : null;
                  return (
                    <tr key={s.id}>
                      <Td>
                        <span className="font-medium text-slate-900">{s.name}</span>
                      </Td>
                      <Td>{s.code}</Td>
                      <Td>{fac?.profiles?.full_name ?? "—"}</Td>
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

      <Card title="End of semester">
        {request?.status === "pending" ? (
          <div className="flex items-center gap-3">
            <Chip kind="pending" label="Awaiting faculty approval" />
            <p className="text-sm text-slate-600">
              Requested on {formatDate(request.requested_at)}. Your faculty will
              approve your promotion to the next semester.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-xl text-sm leading-relaxed text-slate-600">
              Finished Semester {classroom.semester}? Send an end-of-semester
              request to your faculty. Once approved, you move to{" "}
              {classroom.semester >= 8
                ? "graduation"
                : `Semester ${classroom.semester + 1}`}
              .
            </p>
            <SemesterEndButton />
          </div>
        )}
      </Card>
    </div>
  );
}
