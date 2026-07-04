import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Empty } from "@/components/ui";
import RegistrationForm from "./registration-form";

export const metadata = { title: "Semester Registration" };

export default async function RegisterSemesterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("id, branch_id, status, classrooms(semester)")
    .eq("id", user!.id)
    .single();
  if (!student || student.status !== "active") redirect("/student");

  const current = (student.classrooms as unknown as { semester: number } | null)?.semester ?? 0;
  const nextSemester = current + 1;
  if (nextSemester > 8) redirect("/student");

  const { data: plan } = await supabase
    .from("semester_plans")
    .select("id, semester")
    .eq("branch_id", student.branch_id)
    .eq("semester", nextSemester)
    .eq("status", "published")
    .maybeSingle();

  if (!plan) {
    return (
      <div className="space-y-4">
        <Link href="/student" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Dashboard
        </Link>
        <Empty>
          Registration for Semester {nextSemester} is not open yet — your HOD
          has not published the plan.
        </Empty>
      </div>
    );
  }

  const { data: reg } = await supabase
    .from("semester_registrations")
    .select("id")
    .eq("student_id", user!.id)
    .eq("plan_id", plan.id)
    .maybeSingle();
  if (reg) redirect("/student");

  const { data: subjects } = await supabase
    .from("subjects")
    .select(
      "id, name, code, kind, is_lab, parent_subject_id, faculty_id, faculty:faculty_id(profiles(full_name))"
    )
    .eq("plan_id", plan.id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/student" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          Semester {plan.semester} Registration
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Fixed subjects are compulsory and already ticked. Choose your
          electives, then submit — this registers you into Semester{" "}
          {plan.semester} and its subjects.
        </p>
      </div>

      <RegistrationForm
        planId={plan.id}
        semester={plan.semester}
        subjects={(subjects ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          kind: s.kind as "fixed" | "elective",
          is_lab: s.is_lab,
          parent_subject_id: s.parent_subject_id,
          faculty_id: s.faculty_id,
          faculty_name:
            (s.faculty as unknown as { profiles: { full_name: string } } | null)
              ?.profiles?.full_name ?? "—",
        }))}
      />
    </div>
  );
}
