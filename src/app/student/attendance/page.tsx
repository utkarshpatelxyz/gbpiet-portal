import { createClient } from "@/lib/supabase/server";
import { formatDate, pct } from "@/lib/utils";
import { Chip, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";

export const metadata = { title: "My Attendance" };

type Row = {
  final_status: "present" | "absent" | "on_leave";
  attendance_sessions: {
    session_date: string;
    subject_id: string;
    subjects: {
      name: string;
      code: string;
      is_lab: boolean;
      classrooms: { semester: number };
    };
  };
};

export default async function StudentAttendance() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: student }] = await Promise.all([
    supabase
      .from("attendance_records")
      .select(
        "final_status, attendance_sessions!inner(session_date, subject_id, subjects(name, code, is_lab, classrooms(semester)))"
      )
      .eq("student_id", user!.id)
      .not("final_status", "is", null),
    supabase
      .from("students")
      .select("classrooms(semester)")
      .eq("id", user!.id)
      .single(),
  ]);

  const currentSem =
    (student?.classrooms as unknown as { semester: number } | null)?.semester ?? null;

  const rows = (data ?? []) as unknown as Row[];

  // semester → subject → records
  const bySemester = new Map<
    number,
    Map<string, { name: string; code: string; is_lab: boolean; items: Row[] }>
  >();
  for (const r of rows) {
    const s = r.attendance_sessions;
    const sem = s.subjects.classrooms.semester;
    const semMap = bySemester.get(sem) ?? new Map();
    const entry =
      semMap.get(s.subject_id) ??
      { name: s.subjects.name, code: s.subjects.code, is_lab: s.subjects.is_lab, items: [] };
    entry.items.push(r);
    semMap.set(s.subject_id, entry);
    bySemester.set(sem, semMap);
  }
  const semesters = [...bySemester.keys()].sort((a, b) => b - a);

  const allCsvRows = rows
    .sort((a, b) =>
      a.attendance_sessions.session_date.localeCompare(b.attendance_sessions.session_date)
    )
    .map((r) => [
      r.attendance_sessions.subjects.classrooms.semester,
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
            Organized by semester, then by subject. Records lock when your
            teacher finalizes them.
          </p>
        </div>
        {rows.length > 0 && (
          <CsvButton
            filename="my-attendance"
            headers={["Semester", "Subject", "Code", "Date", "Status"]}
            rows={allCsvRows}
            label="Download full record"
          />
        )}
      </div>

      {semesters.length === 0 && <Empty>No finalized attendance yet.</Empty>}

      {semesters.map((sem) => {
        const semMap = bySemester.get(sem)!;
        const isCurrent = sem === currentSem;
        return (
          <details
            key={sem}
            open={isCurrent}
            className="group rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4">
              <span className="font-semibold text-slate-900">
                Semester {sem}
                {isCurrent && (
                  <span className="ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                    Current
                  </span>
                )}
              </span>
              <span className="text-sm text-slate-500">
                {semMap.size} subjects
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
                  className="ml-2 inline h-4 w-4 transition-transform duration-200 group-open:rotate-180">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </span>
            </summary>
            <div className="space-y-4 border-t border-slate-100 p-5">
              {[...semMap.entries()].map(([id, subj]) => {
                const present = subj.items.filter((i) => i.final_status === "present").length;
                const p = pct(present, subj.items.length);
                const sorted = [...subj.items].sort((a, b) =>
                  b.attendance_sessions.session_date.localeCompare(a.attendance_sessions.session_date)
                );
                return (
                  <details key={id} className="rounded-lg border border-slate-200">
                    <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium text-slate-900">
                        {subj.name}{" "}
                        <span className="text-slate-500">({subj.code})</span>
                        {subj.is_lab && (
                          <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                            Lab
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-sm font-semibold ${
                          p !== null && p < 75 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {p}% present
                      </span>
                    </summary>
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
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
                  </details>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
