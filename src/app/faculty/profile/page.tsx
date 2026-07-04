import { createClient } from "@/lib/supabase/server";
import { Empty } from "@/components/ui";
import ProfileEditor from "./profile-editor";

export const metadata = { title: "My Profile" };

export default async function FacultyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: faculty } = await supabase
    .from("faculty")
    .select("id, designations, expertise, education, awards, branches(name), profiles(full_name, email)")
    .eq("id", user!.id)
    .single();

  if (!faculty) return <Empty>Your faculty record could not be loaded.</Empty>;
  const profile = faculty.profiles as unknown as { full_name: string; email: string };
  const branch = faculty.branches as unknown as { name: string } | null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Visible to students and your HOD. Name and department come from your
          registration.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Name</p>
            <p className="mt-1 font-semibold text-slate-900">{profile.full_name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Department</p>
            <p className="mt-1 font-semibold text-slate-900">{branch?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
            <p className="mt-1 font-semibold text-slate-900">{profile.email}</p>
          </div>
        </div>
      </div>

      <ProfileEditor
        initial={{
          designations: (faculty.designations ?? []) as { title: string; period: string }[],
          expertise: (faculty.expertise ?? []) as string[],
          education: (faculty.education ?? []) as {
            level: string;
            degree: string;
            institution: string;
            year: string;
          }[],
          awards: (faculty.awards ?? []) as { title: string; year: string }[],
        }}
      />
    </div>
  );
}
