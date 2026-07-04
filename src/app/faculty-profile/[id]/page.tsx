import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackLink from "./back-link";

export const metadata = { title: "Faculty Profile" };

type Designation = { title: string; period: string };
type Education = { level: string; degree: string; institution: string; year: string };
type Award = { title: string; year: string };

export default async function FacultyPublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: faculty } = await supabase
    .from("faculty")
    .select(
      "id, designations, expertise, education, awards, branches(name), profiles(full_name, email)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!faculty) notFound();

  const profile = faculty.profiles as unknown as { full_name: string; email: string };
  const branch = faculty.branches as unknown as { name: string } | null;
  const designations = (faculty.designations ?? []) as Designation[];
  const expertise = (faculty.expertise ?? []) as string[];
  const education = (faculty.education ?? []) as Education[];
  const awards = (faculty.awards ?? []) as Award[];

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name, code, is_lab, semester_plans(status)")
    .eq("faculty_id", id);
  const teaching = (subjects ?? []).filter((s) => {
    const p = s.semester_plans as unknown as { status: string } | null;
    return !p || p.status === "published";
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <BackLink />
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
            {profile.full_name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{profile.full_name}</h1>
            <p className="text-sm text-slate-600">
              {branch?.name ?? "Department not set"}
              {designations.length > 0 && ` · ${designations[0].title}`}
            </p>
          </div>
        </div>

        {designations.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Designations
            </h2>
            <ul className="mt-2 space-y-1.5">
              {designations.map((d, i) => (
                <li key={i} className="text-sm text-slate-800">
                  <span className="font-medium">{d.title}</span>
                  {d.period && <span className="text-slate-500"> — {d.period}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {expertise.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Areas of expertise
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {expertise.map((x, i) => (
                <span key={i}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                  {x}
                </span>
              ))}
            </div>
          </section>
        )}

        {education.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Education
            </h2>
            <ul className="mt-2 space-y-2">
              {education.map((e, i) => (
                <li key={i} className="text-sm text-slate-800">
                  <span className="font-medium">{e.level}</span>
                  {e.degree && ` · ${e.degree}`}
                  {e.institution && <span className="text-slate-600"> — {e.institution}</span>}
                  {e.year && <span className="text-slate-500"> ({e.year})</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {awards.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Awards & honors
            </h2>
            <ul className="mt-2 space-y-1.5">
              {awards.map((a, i) => (
                <li key={i} className="text-sm text-slate-800">
                  <span className="font-medium">{a.title}</span>
                  {a.year && <span className="text-slate-500"> ({a.year})</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {teaching.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Currently teaching
            </h2>
            <ul className="mt-2 space-y-1.5">
              {teaching.map((s) => (
                <li key={s.id} className="text-sm text-slate-800">
                  {s.name} <span className="text-slate-500">({s.code})</span>
                  {s.is_lab && (
                    <span className="ml-2 rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-600/20">
                      Lab
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {designations.length + expertise.length + education.length + awards.length === 0 && (
          <p className="mt-8 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            This faculty member has not filled out their profile yet.
          </p>
        )}
      </div>
    </main>
  );
}
