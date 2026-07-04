import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { Card, Chip, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";

export const metadata = { title: "My Marks" };

type MarkRow = {
  marks_obtained: number;
  passed: boolean | null;
  assessments: {
    id: string;
    title: string;
    type: "class_test" | "final";
    max_marks: number;
    passing_marks: number;
    subjects: { id: string; name: string; code: string; is_lab: boolean };
  };
};

export default async function StudentMarks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data }, { data: attempts }] = await Promise.all([
    supabase
      .from("marks")
      .select(
        "marks_obtained, passed, assessments!inner(id, title, type, max_marks, passing_marks, subjects(id, name, code, is_lab))"
      )
      .eq("student_id", user!.id),
    supabase
      .from("final_attempts")
      .select("subject_id, max_marks, passing_marks, marks_obtained, passed, created_at, subjects(name, code)")
      .eq("student_id", user!.id)
      .order("created_at"),
  ]);

  const rows = (data ?? []) as unknown as MarkRow[];
  const bySubject = new Map<string, { name: string; code: string; is_lab: boolean; items: MarkRow[] }>();
  for (const r of rows) {
    const s = r.assessments.subjects;
    const entry =
      bySubject.get(s.id) ?? { name: s.name, code: s.code, is_lab: s.is_lab, items: [] };
    entry.items.push(r);
    bySubject.set(s.id, entry);
  }
  const attemptsBySubject = new Map<string, NonNullable<typeof attempts>>();
  for (const a of attempts ?? []) {
    const list = attemptsBySubject.get(a.subject_id) ?? [];
    list.push(a);
    attemptsBySubject.set(a.subject_id, list);
  }

  const csvRows = rows.map((r) => [
    r.assessments.subjects.name,
    r.assessments.subjects.code,
    r.assessments.title,
    r.assessments.type === "final" ? "Final Exam" : "Class Test",
    r.marks_obtained,
    r.assessments.max_marks,
    r.assessments.passing_marks,
    r.passed === false ? "FAILED" : r.passed === true ? "PASSED" : "",
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Marks</h1>
          <p className="mt-1 text-sm text-slate-600">
            Class tests, final exams, and re-appearance attempts across your
            subjects and labs.
          </p>
        </div>
        {rows.length > 0 && (
          <CsvButton
            filename="my-marks"
            headers={["Subject", "Code", "Assessment", "Type", "Marks", "Max", "Passing", "Result"]}
            rows={csvRows}
            label="Download marks sheet"
          />
        )}
      </div>

      {bySubject.size === 0 && (attempts ?? []).length === 0 && (
        <Empty>No marks published yet.</Empty>
      )}

      {[...bySubject.entries()].map(([id, subj]) => {
        const subjectAttempts = attemptsBySubject.get(id) ?? [];
        return (
          <Card
            key={id}
            title={
              <>
                {subj.name} ({subj.code})
                {subj.is_lab && (
                  <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                    Lab
                  </span>
                )}
              </>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <Th>Assessment</Th>
                    <Th>Type</Th>
                    <Th>Marks</Th>
                    <Th>Passing</Th>
                    <Th>Result</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subj.items.map((r, i) => (
                    <tr key={i}>
                      <Td>
                        <span className="font-medium text-slate-900">{r.assessments.title}</span>
                      </Td>
                      <Td>{r.assessments.type === "final" ? "Final Exam" : "Class Test"}</Td>
                      <Td>
                        {r.marks_obtained} / {r.assessments.max_marks}
                      </Td>
                      <Td>{r.assessments.passing_marks}</Td>
                      <Td>
                        {r.passed === false ? (
                          <Chip kind="fail" label="Failed" />
                        ) : r.passed === true ? (
                          <Chip kind="pass" label="Passed" />
                        ) : (
                          "—"
                        )}
                      </Td>
                    </tr>
                  ))}
                  {subjectAttempts.map((a, i) => (
                    <tr key={`att-${i}`}>
                      <Td>
                        <span className="font-medium text-slate-900">
                          Re-appearance attempt {i + 1}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {formatDate(a.created_at)}
                        </span>
                      </Td>
                      <Td>Re-appearance</Td>
                      <Td>
                        {a.marks_obtained} / {a.max_marks}
                      </Td>
                      <Td>{a.passing_marks}</Td>
                      <Td>
                        {a.passed ? (
                          <Chip kind="pass" label="Passed" />
                        ) : (
                          <Chip kind="fail" label="Failed" />
                        )}
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
