import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { classroomLabel } from "@/lib/utils";
import { Card, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";

export default async function ClassroomDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const classroomId = Number(id);
  if (Number.isNaN(classroomId)) notFound();

  const supabase = await createClient();
  const { data: classroom } = await supabase
    .from("classrooms")
    .select("id, year, semester, branches(name, code)")
    .eq("id", classroomId)
    .maybeSingle();
  if (!classroom) notFound();
  const branch = classroom.branches as unknown as { name: string; code: string };

  const [{ data: students }, { data: subjects }] = await Promise.all([
    supabase
      .from("students")
      .select("id, enrollment_no, roll_no, profiles(full_name)")
      .eq("classroom_id", classroomId)
      .eq("status", "active")
      .order("roll_no"),
    supabase
      .from("subjects")
      .select("id, name, code, faculty:faculty_id(profiles(full_name))")
      .eq("classroom_id", classroomId)
      .order("created_at"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/faculty/classrooms" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← All classrooms
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {classroomLabel(branch.name, classroom.year, classroom.semester)}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {(students ?? []).length} students · {(subjects ?? []).length} subjects
        </p>
      </div>

      <Card
        title="Students"
        action={
          (students ?? []).length > 0 ? (
            <CsvButton
              filename={`students-${branch.code}-S${classroom.semester}`}
              headers={["Roll No", "Enrollment No", "Name"]}
              rows={(students ?? []).map((st) => [
                st.roll_no,
                st.enrollment_no,
                (st.profiles as unknown as { full_name: string }).full_name,
              ])}
              label="Student list"
            />
          ) : undefined
        }
      >
        {(students ?? []).length === 0 ? (
          <Empty>No students have joined this classroom yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Roll No</Th>
                  <Th>Enrollment No</Th>
                  <Th>Name</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(students ?? []).map((st) => (
                  <tr key={st.id}>
                    <Td>{st.roll_no}</Td>
                    <Td>{st.enrollment_no}</Td>
                    <Td>
                      <span className="font-medium text-slate-900">
                        {(st.profiles as unknown as { full_name: string }).full_name}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Subjects in this classroom">
        {(subjects ?? []).length === 0 ? (
          <Empty>No subjects assigned yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Subject</Th>
                  <Th>Code</Th>
                  <Th>Faculty</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(subjects ?? []).map((s) => {
                  const fac = s.faculty as unknown as { profiles: { full_name: string } } | null;
                  return (
                    <tr key={s.id}>
                      <Td>
                        <span className="font-medium text-slate-900">{s.name}</span>
                      </Td>
                      <Td>{s.code}</Td>
                      <Td>{fac?.profiles?.full_name ?? "—"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
