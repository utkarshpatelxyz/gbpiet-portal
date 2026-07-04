import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";

export const metadata = { title: "Faculty Roster" };

export default async function FacultyRoster() {
  const supabase = await createClient();

  const [{ data: facultyRows }, { data: branches }, { data: subjects }, { data: hods }] =
    await Promise.all([
      supabase.from("faculty").select("id, branch_id, profiles(full_name, email)"),
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("subjects").select("id, faculty_id"),
      supabase.from("hods").select("id, branch_id, profiles(full_name, email)"),
    ]);

  const subjectCount = new Map<string, number>();
  for (const s of subjects ?? []) {
    subjectCount.set(s.faculty_id, (subjectCount.get(s.faculty_id) ?? 0) + 1);
  }
  const branchName = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const roster = (facultyRows ?? [])
    .map((f) => ({
      id: f.id,
      branch: f.branch_id ? branchName.get(f.branch_id) ?? "—" : "Unassigned",
      name: (f.profiles as unknown as { full_name: string; email: string }).full_name,
      email: (f.profiles as unknown as { full_name: string; email: string }).email,
      subjects: subjectCount.get(f.id) ?? 0,
    }))
    .sort((a, b) => a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name));

  const hodList = (hods ?? []).map((h) => ({
    id: h.id,
    branch: branchName.get(h.branch_id) ?? "—",
    name: (h.profiles as unknown as { full_name: string; email: string }).full_name,
    email: (h.profiles as unknown as { full_name: string; email: string }).email,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty Roster</h1>
          <p className="mt-1 text-sm text-slate-600">
            All registered faculty and heads of department.
          </p>
        </div>
        {roster.length > 0 && (
          <CsvButton
            filename="faculty-roster"
            headers={["Name", "Email", "Department", "Subjects Taught"]}
            rows={roster.map((f) => [f.name, f.email, f.branch, f.subjects])}
            label="Download roster"
          />
        )}
      </div>

      <Card title={`Heads of Department (${hodList.length})`}>
        {hodList.length === 0 ? (
          <Empty>No HODs have registered yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Department</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hodList.map((h) => (
                  <tr key={h.id}>
                    <Td>
                      <span className="font-medium text-slate-900">{h.name}</span>
                    </Td>
                    <Td>{h.email}</Td>
                    <Td>{h.branch}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={`Faculty members (${roster.length})`}>
        {roster.length === 0 ? (
          <Empty>No faculty have registered yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Department</Th>
                  <Th>Subjects</Th>
                  <Th>Profile</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {roster.map((f) => (
                  <tr key={f.id}>
                    <Td>
                      <span className="font-medium text-slate-900">{f.name}</span>
                    </Td>
                    <Td>{f.email}</Td>
                    <Td>{f.branch}</Td>
                    <Td>{f.subjects}</Td>
                    <Td>
                      <Link
                        href={`/faculty-profile/${f.id}`}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        View →
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
