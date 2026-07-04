import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, title, type, max_marks, subjects(id, name, code, faculty_id, classroom_id)")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!assessment) notFound();
  const subject = assessment.subjects as unknown as {
    id: string;
    name: string;
    code: string;
    faculty_id: string;
    classroom_id: number;
  };
  if (subject.id !== id || subject.faculty_id !== user!.id) notFound();

  const [{ data: students }, { data: marks }] = await Promise.all([
    supabase
      .from("students")
      .select("id, enrollment_no, roll_no, profiles(full_name)")
      .eq("classroom_id", subject.classroom_id)
      .eq("status", "active")
      .order("roll_no"),
    supabase
      .from("marks")
      .select("student_id, marks_obtained, passed")
      .eq("assessment_id", assessmentId),
  ]);

  const studentList = (students ?? []).map((st) => ({
    id: st.id,
    roll_no: st.roll_no,
    enrollment_no: st.enrollment_no,
    full_name: (st.profiles as unknown as { full_name: string }).full_name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/faculty/subjects/${subject.id}`}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          ← {subject.name} ({subject.code})
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {assessment.title}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {assessment.type === "final" ? "Final exam" : "Class test"} · max{" "}
          {assessment.max_marks} marks
        </p>
      </div>

      {studentList.length === 0 ? (
        <Empty>No students in this classroom yet.</Empty>
      ) : (
        <MarksForm
          assessmentId={assessment.id}
          isFinal={assessment.type === "final"}
          maxMarks={Number(assessment.max_marks)}
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
