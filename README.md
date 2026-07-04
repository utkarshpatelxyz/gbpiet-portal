# GBPIET Portal — Institute Management System

Production web platform for **G.B. Pant Institute of Engineering and Technology**: four role-based dashboards (Student, Faculty, HOD, Director) covering semester planning, subjects & labs, two-phase verified attendance, marks with re-appearance history, backlogs, and semester registration.

**Stack:** Next.js (App Router, Vercel) · Supabase (Postgres, Auth, Row Level Security) · Tailwind CSS. Runs entirely on free tiers.

## How it works

- **Registration is self-service.** Four roles: Student, Faculty, HOD (one per department), Director. Students register with a unique enrollment number and roll number plus their branch — semester placement happens only through semester registration forms.
- **Semester planning (HOD)**: each HOD builds the subject plan for an upcoming semester — subjects and labs (linked to a subject or standalone), each assigned to a department faculty member and marked fixed or elective — then publishes it. Publishing shows assigned faculty their subjects and opens the registration form for eligible students.
- **Semester registration (students)**: fixed subjects are pre-ticked and locked, electives are chosen; submitting the form IS the migration into the next semester and enrolls the student into each selected subject and lab.
- **Attendance (two-phase, teacher-final):** faculty open a session for a date → students self-mark *Present* or *On Leave* (absence cannot be self-marked) → faculty sees live self-mark counts, physically verifies, sets the final status per student, and finalizes. Finalized sessions are **immutable** — enforced by database triggers, not just UI.
- **Marks**: unlimited class tests plus exactly one final exam per subject (enforced in the database), each with maximum AND passing marks — pass/fail is computed automatically. A failed final records a **backlog**; faculty enter re-appearance attempts with fresh max/pass/obtained marks, preserving the full attempt history, until the student passes.
- **Completed subjects**: once final marks exist for every registered student, the subject moves to a Completed section with pass/fail counts.
- **Faculty profiles**: designations, expertise, education, awards — editable by the faculty member, viewable by students and the HOD.
- **Director**: read-everything overview, per-classroom drill-downs, faculty & HOD roster.
- **Exports**: CSV downloads for attendance registers, marks sheets, student lists, rosters, and each student's own record.

## Deploy from scratch

1. **Supabase**: create a project, then apply all files in `supabase/migrations/` in order (or `supabase db push`). This creates the full schema, RLS policies, triggers, and seeds the 7 branches × 8 semester classrooms (no user data).
2. **Auth settings** (Supabase → Authentication → URL Configuration): set the Site URL to your deployment URL and add `https://<your-domain>/auth/callback` to redirect URLs.
3. **Vercel**: import this repo, set the environment variables from `.env.example`, deploy.
4. **Director account**: register normally, sign in, visit `/setup-director`, and enter the `DIRECTOR_SETUP_CODE` you configured. That account becomes the director.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev
```

## Security model

All access control is enforced in Postgres with Row Level Security:

- Students read only their own records plus their classroom's shared data; they can write only their own attendance self-mark while a session is open.
- Faculty manage only their own subjects, sessions, assessments, and marks; attendance finalization and semester approval run through `security definer` RPCs that re-verify ownership.
- The director has read access to everything and takes no attendance/marks actions.
- Attendance immutability, role-escalation prevention, and backlog syncing are database triggers.
