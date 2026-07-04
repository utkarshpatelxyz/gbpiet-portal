import { createClient } from "@/lib/supabase/server";
import { Card, Empty, Th, Td } from "@/components/ui";
import CsvButton from "@/components/csv-button";
import HodToggle from "./hod-toggle";

export const metadata = { title: "Faculty Roster" };

export default async function FacultyRoster() {
  const supabase = await createClient();

  const [{ data: facultyRows }, { data: branches }, { data: subjects }] =
    await Promise.all([
      supabase
        .from("faculty")
        .select("id, branch_id, is_hod, profiles(full_name, email)"),
      supabase.from("branches").select("id, name").order("name"),
      supabase.from("subjects").select("id, faculty_id"),
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
      is_hod: f.is_hod,
      name: (f.profiles as unknown as { full_name: string; email: string }).full_name,
      email: (f.profiles as unknown as { full_name: string; email: string }).email,
      subjects: subjectCount.get(f.id) ?? 0,
    }))
    .sort((a, b) => a.branch.localeCompare(b.branch) || a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty Roster</h1>
          <p className="mt-1 text-sm text-slate-600">
            All registered faculty by department. Toggle HOD designation as
            needed.
          </p>
        </div>
        {roster.length > 0 && (
          <CsvButton
            filename="faculty-roster"
            headers={["Name", "Email", "Department", "HOD", "Subjects Taught"]}
            rows={roster.map((f) => [
              f.name,
              f.email,
              f.branch,
              f.is_hod ? "Yes" : "No",
              f.subjects,
            ])}
            label="Download roster"
          />
        )}
      </div>

      <Card title={`${roster.length} faculty members`}>
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
                  <Th>HOD</Th>
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
                      <HodToggle facultyId={f.id} isHod={f.is_hod} />
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
