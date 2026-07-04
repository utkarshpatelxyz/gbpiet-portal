import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    title: "Two-phase attendance",
    body: "Students self-mark Present or On Leave; the teacher physically verifies, finalizes, and the record locks forever. No end-of-semester disputes.",
  },
  {
    title: "Live classrooms",
    body: "Subjects added by faculty appear instantly for every student in the classroom. Marks, tests, and results stay in sync across dashboards.",
  },
  {
    title: "Semester progression",
    body: "Students request semester end, faculty approve individually or in bulk, and backlogs stay on record until cleared.",
  },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile) redirect(`/${profile.role}`);
  }

  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              GB
            </span>
            <span className="font-semibold">GBPIET Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 py-20 text-center">
        <p className="rounded-full bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
          G.B. Pant Institute of Engineering and Technology
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          One portal for students, faculty, and the director
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
          Classrooms, subjects, verified attendance, marks, and semester
          progression — connected in real time across every role in the
          institute.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-indigo-700"
          >
            Create your account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-16 grid w-full gap-6 text-left sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        GBPIET Portal · Institute Management System
      </footer>
    </main>
  );
}
