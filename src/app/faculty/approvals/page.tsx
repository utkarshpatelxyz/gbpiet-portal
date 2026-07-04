import { createClient } from "@/lib/supabase/server";
import { classroomLabel, formatDate } from "@/lib/utils";
import { Card, Chip, Empty } from "@/components/ui";
import { ApproveOne, ApproveAll } from "./approve-buttons";

export const metadata = { title: "Semester-End Approvals" };

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Classrooms where I teach.
  const { data: mySubjects } = await supabase
    .from("subjects")
    .select("id, classroom_id")
    .eq("faculty_id", user!.id);
  const myClassrooms = [...new Set((mySubjects ?? []).map((s) => s.classroom_id))];

  const { data: requests } = myClassrooms.length
    ? await supabase
        .from("semester_end_requests")
        .select(
          "id, status, requested_at, classroom_id, students(id, enrollment_no, roll_no, profiles(full_name)), classrooms(year, semester, branches(name))"
        )
        .in("classroom_id", myClassrooms)
        .eq("status", "pending")
        .order("requested_at")
    : { data: [] };

  // Pending backlogs in MY subjects, to flag students I cannot approve.
  const { data: myBacklogs } = (mySubjects ?? []).length
    ? await supabase
        .from("backlogs")
        .select("student_id, subject_id")
        .eq("status", "pending")
        .in("subject_id", (mySubjects ?? []).map((s) => s.id))
    : { data: [] };
  const blockedStudents = new Set((myBacklogs ?? []).map((b) => b.student_id));

  const byClassroom = new Map<number, typeof requests>();
  for (const r of requests ?? []) {
    const list = byClassroom.get(r.classroom_id) ?? [];
    list!.push(r);
    byClassroom.set(r.classroom_id, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Semester-End Approvals</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pending requests from classrooms where you teach. Approving promotes
          the student to the next semester; you cannot approve a student who
          failed your subject.
        </p>
      </div>

      {byClassroom.size === 0 && <Empty>No pending semester-end requests.</Empty>}

      {[...byClassroom.entries()].map(([classroomId, reqs]) => {
        const first = reqs![0];
        const c = first.classrooms as unknown as {
          year: number;
          semester: number;
          branches: { name: string };
        };
        return (
          <Card
            key={classroomId}
            title={`${classroomLabel(c.branches.name, c.year, c.semester)} — ${reqs!.length} pending`}
            action={<ApproveAll classroomId={classroomId} count={reqs!.length} />}
          >
            <ul className="divide-y divide-slate-100">
              {reqs!.map((r) => {
                const st = r.students as unknown as {
                  id: string;
                  enrollment_no: string;
                  roll_no: string;
                  profiles: { full_name: string };
                };
                const blocked = blockedStudents.has(st.id);
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {st.profiles.full_name}
                        {blocked && (
                          <span className="ml-2 align-middle">
                            <Chip kind="fail" label="Failed your subject — backlog" />
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        Roll {st.roll_no} · {st.enrollment_no} · requested{" "}
                        {formatDate(r.requested_at)}
                      </p>
                    </div>
                    <ApproveOne requestId={r.id} />
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
