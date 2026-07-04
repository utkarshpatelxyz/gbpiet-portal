import Link from "next/link";
import { signOut } from "@/app/actions";

const LINKS: Record<string, { href: string; label: string }[]> = {
  student: [
    { href: "/student", label: "Dashboard" },
    { href: "/student/attendance", label: "Attendance" },
    { href: "/student/marks", label: "Marks" },
  ],
  faculty: [
    { href: "/faculty", label: "My Subjects" },
    { href: "/faculty/classrooms", label: "Classrooms" },
    { href: "/faculty/approvals", label: "Approvals" },
  ],
  director: [
    { href: "/director", label: "Overview" },
    { href: "/director/faculty", label: "Faculty Roster" },
  ],
};

export default function Nav({
  role,
  name,
}: {
  role: "student" | "faculty" | "director";
  name: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href={`/${role}`} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
              GB
            </span>
            <span className="hidden text-sm font-semibold text-slate-900 sm:block">
              GBPIET Portal
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {LINKS[role].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-40 truncate text-sm text-slate-600 md:block">
            {name}
          </span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            {role}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
