import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSubjectRoster } from "@/lib/roster";
import { Empty } from "@/components/ui";
import MarksForm from "./marks-form";

export default async function MarksEntryPage({
  params,
}: {
  params: Promise<{ id: string; assessmentId: string }>;
}) {
  const { id, assessmentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: assessment } = await supabase
    .from("assessments")
    .select(
      "id, title, type, max_marks, passing_marks, subjects(id, name, code, plan_id, faculty_id, classroom_id)"
    )
    .eq("id", assessmentId)
    .maybeSingle();
  if (!assessment) notFound();
  const subject = assessment.subjects as unknown as {
    id: string;
    name: string;
    code: string;
    plan_id: string | null;
    faculty_id: string;
    classroom_id: number;
  };
  if (subject.id !== id || subject.faculty_id !== user!.id) notFound();

  const [studentList, { data: marks }] = await Promise.all([
    getSubjectRoster(supabase, subject),
    supabase
      .from("marks")
      .select("student_id, marks_obtained, passed")
      .eq("assessment_id", assessmentId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/faculty/subjects/${subject.id}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← {subject.name} ({subject.code})
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{assessment.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {assessment.type === "final" ? "Final exam" : "Class test"} · max{" "}
          {assessment.max_marks} · passing {assessment.passing_marks}. Pass or
          fail is computed automatically from the passing marks.
        </p>
      </div>

      {studentList.length === 0 ? (
        <Empty>No students are registered for this subject yet.</Empty>
      ) : (
        <MarksForm
          assessmentId={assessment.id}
          isFinal={assessment.type === "final"}
          maxMarks={Number(assessment.max_marks)}
          passingMarks={Number(assessment.passing_marks)}
          students={studentList}
          existing={Object.fromEntries(
            (marks ?? []).map((m) => [
              m.student_id,
              { marks_obtained: Number(m.marks_obtained), passed: m.passed },
            ])
          )}
        />
      )}
    </div>
  );
}
