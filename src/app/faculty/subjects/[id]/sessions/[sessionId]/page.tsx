import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubjectRoster } from "@/lib/roster";
import { formatDate } from "@/lib/utils";
import { Chip, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";
import FinalizeBoard from "./finalize-board";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const { id, sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("attendance_sessions")
    .select(
      "id, session_date, status, subjects(id, name, code, is_lab, plan_id, faculty_id, classroom_id)"
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) notFound();
  const subject = session.subjects as unknown as {
    id: string;
    name: string;
    code: string;
    is_lab: boolean;
    plan_id: string | null;
    faculty_id: string;
    classroom_id: number;
  };
  if (subject.id !== id || subject.faculty_id !== user!.id) notFound();

  const studentList = await getSubjectRoster(supabase, subject);

  const { data: records } = await supabase
    .from("attendance_records")
    .select("student_id, self_status, final_status")
    .eq("session_id", sessionId);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/faculty/subjects/${subject.id}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← {subject.name} ({subject.code})
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            Attendance — {formatDate(session.session_date)}
          </h1>
          <Chip kind={session.status} label={session.status === "open" ? "Open" : "Finalized"} />
          {subject.is_lab && (
            <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
              Lab
            </span>
          )}
        </div>
      </div>

      {studentList.length === 0 ? (
        <Empty>No students are registered for this subject yet.</Empty>
      ) : session.status === "open" ? (
        <FinalizeBoard
          sessionId={sessionId}
          students={studentList}
          initialSelf={Object.fromEntries(
            studentList.map((st) => [
              st.id,
              ((records ?? []).find((r) => r.student_id === st.id)?.self_status ??
                null) as "present" | "on_leave" | null,
            ])
          )}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <CsvButton
              filename={`attendance-${subject.code}-${session.session_date}`}
              headers={["Roll No", "Enrollment No", "Name", "Self-mark", "Final Status"]}
              rows={studentList.map((st) => {
                const r = (records ?? []).find((x) => x.student_id === st.id);
                return [
                  st.roll_no,
                  st.enrollment_no,
                  st.full_name,
                  r?.self_status?.replace("_", " ") ?? "not marked",
                  r?.final_status?.replace("_", " ") ?? "",
                ];
              })}
            />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Roll</Th>
                  <Th>Student</Th>
                  <Th>Self-mark</Th>
                  <Th>Final (locked)</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentList.map((st) => {
                  const r = (records ?? []).find((x) => x.student_id === st.id);
                  return (
                    <tr key={st.id}>
                      <Td>{st.roll_no}</Td>
                      <Td>
                        <span className="font-medium text-slate-900">{st.full_name}</span>
                        <span className="block text-xs text-slate-500">{st.enrollment_no}</span>
                      </Td>
                      <Td>
                        {r?.self_status ? (
                          <Chip kind={r.self_status} label={`Self: ${r.self_status.replace("_", " ")}`} />
                        ) : (
                          <Chip kind="empty" label="Not marked" />
                        )}
                      </Td>
                      <Td>{r?.final_status ? <Chip kind={r.final_status} /> : "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500">
            This session is finalized and permanently locked.
          </p>
        </div>
      )}
    </div>
  );
}
