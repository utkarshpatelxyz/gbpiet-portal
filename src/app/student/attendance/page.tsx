import { createClient } from "@/lib/supabase/server";
import { formatDate, pct } from "@/lib/utils";
import { Card, Chip, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";

export const metadata = { title: "My Attendance" };

type Row = {
  final_status: "present" | "absent" | "on_leave";
  attendance_sessions: {
    session_date: string;
    subject_id: string;
    subjects: { name: string; code: string };
  };
};

export default async function StudentAttendance() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("attendance_records")
    .select(
      "final_status, attendance_sessions!inner(session_date, subject_id, subjects(name, code))"
    )
    .eq("student_id", user!.id)
    .not("final_status", "is", null);

  const rows = (data ?? []) as unknown as Row[];
  const bySubject = new Map<string, { name: string; code: string; items: Row[] }>();
  for (const r of rows) {
    const s = r.attendance_sessions;
    const entry =
      bySubject.get(s.subject_id) ??
      { name: s.subjects.name, code: s.subjects.code, items: [] };
    entry.items.push(r);
    bySubject.set(s.subject_id, entry);
  }

  const allCsvRows = rows
    .sort((a, b) =>
      a.attendance_sessions.session_date.localeCompare(b.attendance_sessions.session_date)
    )
    .map((r) => [
      r.attendance_sessions.subjects.name,
      r.attendance_sessions.subjects.code,
      r.attendance_sessions.session_date,
      r.final_status.replace("_", " "),
    ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Attendance</h1>
          <p className="mt-1 text-sm text-slate-600">
            Finalized attendance per subject. Records are locked once your
            teacher submits them.
          </p>
        </div>
        {rows.length > 0 && (
          <CsvButton
            filename="my-attendance"
            headers={["Subject", "Code", "Date", "Status"]}
            rows={allCsvRows}
            label="Download full record"
          />
        )}
      </div>

      {bySubject.size === 0 && (
        <Empty>No finalized attendance yet.</Empty>
      )}

      {[...bySubject.entries()].map(([id, subj]) => {
        const present = subj.items.filter((i) => i.final_status === "present").length;
        const p = pct(present, subj.items.length);
        const sorted = [...subj.items].sort((a, b) =>
          b.attendance_sessions.session_date.localeCompare(a.attendance_sessions.session_date)
        );
        return (
          <Card
            key={id}
            title={
              <>
                {subj.name} ({subj.code}) —{" "}
                <span className={p !== null && p < 75 ? "text-rose-600" : "text-emerald-700"}>
                  {p}% present
                </span>
              </>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <Th>Date</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((r, i) => (
                    <tr key={i}>
                      <Td>{formatDate(r.attendance_sessions.session_date)}</Td>
                      <Td>
                        <Chip kind={r.final_status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
