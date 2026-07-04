import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Chip, Empty } from "@/components/ui";
import PlanEditor from "./plan-editor";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: hod } = await supabase
    .from("hods")
    .select("branch_id, branches(name)")
    .eq("id", user!.id)
    .single();
  if (!hod) notFound();

  const { data: plan } = await supabase
    .from("semester_plans")
    .select("id, branch_id, semester, status, published_at")
    .eq("id", id)
    .maybeSingle();
  if (!plan || plan.branch_id !== hod.branch_id) notFound();

  const [{ data: faculty }, { data: subjects }, { data: classroom }] =
    await Promise.all([
      supabase
        .from("faculty")
        .select("id, profiles(full_name)")
        .eq("branch_id", hod.branch_id),
      supabase
        .from("subjects")
        .select("id, name, code, faculty_id, kind, is_lab, parent_subject_id")
        .eq("plan_id", plan.id)
        .order("created_at"),
      supabase
        .from("classrooms")
        .select("id")
        .eq("branch_id", plan.branch_id)
        .eq("semester", plan.semester)
        .single(),
    ]);

  const facultyList = (faculty ?? []).map((f) => ({
    id: f.id,
    name: (f.profiles as unknown as { full_name: string }).full_name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/hod/plans" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Semester plans
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            Semester {plan.semester} plan —{" "}
            {(hod.branches as unknown as { name: string }).name}
          </h1>
          <Chip
            kind={plan.status === "published" ? "approved" : "pending"}
            label={plan.status === "published" ? "Published" : "Draft"}
          />
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Add subjects and labs, link each to a faculty member, mark them fixed
          or elective, then publish to open student registration.
        </p>
      </div>

      {facultyList.length === 0 ? (
        <Empty>
          No faculty have registered under your department yet — subjects need
          an assigned faculty member.
        </Empty>
      ) : (
        <PlanEditor
          planId={plan.id}
          classroomId={(classroom as { id: number }).id}
          status={plan.status as "draft" | "published"}
          faculty={facultyList}
          initialSubjects={(subjects ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            faculty_id: s.faculty_id,
            kind: s.kind as "fixed" | "elective",
            is_lab: s.is_lab,
            parent_subject_id: s.parent_subject_id,
          }))}
        />
      )}
    </div>
  );
}
