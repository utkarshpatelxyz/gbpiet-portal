import { createClient } from "@/lib/supabase/server";
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
    subjects: { id: string; name: string; code: string };
  };
};

export default async function StudentMarks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("marks")
    .select(
      "marks_obtained, passed, assessments!inner(id, title, type, max_marks, subjects(id, name, code))"
    )
    .eq("student_id", user!.id);

  const rows = (data ?? []) as unknown as MarkRow[];
  const bySubject = new Map<string, { name: string; code: string; items: MarkRow[] }>();
  for (const r of rows) {
    const s = r.assessments.subjects;
    const entry = bySubject.get(s.id) ?? { name: s.name, code: s.code, items: [] };
    entry.items.push(r);
    bySubject.set(s.id, entry);
  }

  const csvRows = rows.map((r) => [
    r.assessments.subjects.name,
    r.assessments.subjects.code,
    r.assessments.title,
    r.assessments.type === "final" ? "Final Exam" : "Class Test",
    r.marks_obtained,
    r.assessments.max_marks,
    r.assessments.type === "final" ? (r.passed === false ? "FAIL" : r.passed === true ? "PASS" : "") : "",
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Marks</h1>
          <p className="mt-1 text-sm text-slate-600">
            Class tests and final exam results across your subjects.
          </p>
        </div>
        {rows.length > 0 && (
          <CsvButton
            filename="my-marks"
            headers={["Subject", "Code", "Assessment", "Type", "Marks", "Max Marks", "Result"]}
            rows={csvRows}
            label="Download marks sheet"
          />
        )}
      </div>

      {bySubject.size === 0 && <Empty>No marks published yet.</Empty>}

      {[...bySubject.entries()].map(([id, subj]) => (
        <Card key={id} title={`${subj.name} (${subj.code})`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Assessment</Th>
                  <Th>Type</Th>
                  <Th>Marks</Th>
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
                    <Td>
                      {r.assessments.type === "final" ? (
                        r.passed === false ? (
                          <Chip kind="fail" label="Fail — Backlog" />
                        ) : r.passed === true ? (
                          <Chip kind="pass" label="Pass" />
                        ) : (
                          "—"
                        )
                      ) : (
                        "—"
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
