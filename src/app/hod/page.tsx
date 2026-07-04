import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Stat, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";

export default async function HodDashboard({
  searchParams,
}: {
  searchParams: Promise<{ semester?: string }>;
}) {
  const { semester } = await searchParams;
  const semFilter = semester ? Number(semester) : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: hod } = await supabase
    .from("hods")
    .select("branch_id, branches(name, code)")
    .eq("id", user!.id)
    .single();
  if (!hod) return <Empty>Your HOD record could not be loaded.</Empty>;
  const branch = hod.branches as unknown as { name: string; code: string };

  const [{ data: facultyRows }, { data: students }, { data: classrooms }] =
    await Promise.all([
      supabase
        .from("faculty")
        .select("id, profiles(full_name, email)")
        .eq("branch_id", hod.branch_id),
      supabase
        .from("students")
        .select("id, enrollment_no, roll_no, status, classroom_id, profiles(full_name, email)")
        .eq("branch_id", hod.branch_id)
        .order("roll_no"),
      supabase.from("classrooms").select("id, semester").eq("branch_id", hod.branch_id),
    ]);

  const semByClassroom = new Map((classrooms ?? []).map((c) => [c.id, c.semester]));
  const withSem = (students ?? []).map((s) => ({
    ...s,
    semester: s.classroom_id ? semByClassroom.get(s.classroom_id) ?? null : null,
  }));
  const filtered =
    semFilter === null ? withSem : withSem.filter((s) => s.semester === semFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{branch.name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Department overview — faculty and students who registered under{" "}
          {branch.code}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Faculty in department" value={(facultyRows ?? []).length} />
        <Stat label="Students in department" value={withSem.length} />
        <Stat
          label="Semester plans"
          value={
            <Link href="/hod/plans" className="text-indigo-600 hover:text-indigo-700">
              Manage →
            </Link>
          }
        />
      </div>

      <Card title="Department faculty">
        {(facultyRows ?? []).length === 0 ? (
          <Empty>No faculty have registered under this department yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Profile</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(facultyRows ?? []).map((f) => {
                  const p = f.profiles as unknown as { full_name: string; email: string };
                  return (
                    <tr key={f.id}>
                      <Td>
                        <span className="font-medium text-slate-900">{p.full_name}</span>
                      </Td>
                      <Td>{p.email}</Td>
                      <Td>
                        <Link
                          href={`/faculty-profile/${f.id}`}
                          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          View profile →
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Department students"
        action={
          filtered.length > 0 ? (
            <CsvButton
              filename={`students-${branch.code}${semFilter ? `-S${semFilter}` : ""}`}
              headers={["Roll No", "Enrollment No", "Name", "Email", "Semester", "Status"]}
              rows={filtered.map((s) => {
                const p = s.profiles as unknown as { full_name: string; email: string };
                return [
                  s.roll_no,
                  s.enrollment_no,
                  p.full_name,
                  p.email,
                  s.semester ?? "Not registered",
                  s.status,
                ];
              })}
              label="Student list"
            />
          ) : undefined
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href="/hod"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
              semFilter === null
                ? "bg-indigo-600 text-white"
                : "border border-slate-300 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All semesters
          </Link>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <Link
              key={s}
              href={`/hod?semester=${s}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                semFilter === s
                  ? "bg-indigo-600 text-white"
                  : "border border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Sem {s}
            </Link>
          ))}
        </div>
        {filtered.length === 0 ? (
          <Empty>No students match this filter.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Roll No</Th>
                  <Th>Enrollment No</Th>
                  <Th>Name</Th>
                  <Th>Semester</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => {
                  const p = s.profiles as unknown as { full_name: string };
                  return (
                    <tr key={s.id}>
                      <Td>{s.roll_no}</Td>
                      <Td>{s.enrollment_no}</Td>
                      <Td>
                        <span className="font-medium text-slate-900">{p.full_name}</span>
                      </Td>
                      <Td>
                        {s.status === "graduated"
                          ? "Graduated"
                          : s.semester
                          ? `Semester ${s.semester}`
                          : "Not registered yet"}
                      </Td>
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
