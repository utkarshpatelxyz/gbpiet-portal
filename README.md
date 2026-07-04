# GBPIET Portal — Institute Management System

Production web platform for **G.B. Pant Institute of Engineering and Technology**: three role-based dashboards (Student, Faculty, Director) covering classrooms, subjects, two-phase verified attendance, marks, backlogs, and semester promotion.

**Stack:** Next.js (App Router, Vercel) · Supabase (Postgres, Auth, Row Level Security) · Tailwind CSS. Runs entirely on free tiers.

## How it works

- **Registration is self-service.** Faculty register with their institute email; students register with any email plus a unique enrollment number and roll number, and pick their branch / year / semester. The matching classroom (7 branches × 8 semesters, auto-seeded) is assigned automatically.
- **Subjects**: faculty create subjects targeted at a classroom; every student in that classroom sees them instantly.
- **Attendance (two-phase, teacher-final):** faculty open a session for a date → students self-mark *Present* or *On Leave* (absence cannot be self-marked) → faculty sees live self-mark counts, physically verifies, sets the final status per student, and finalizes. Finalized sessions are **immutable** — enforced by database triggers, not just UI.
- **Marks**: multiple class tests plus a final exam per subject with Pass/Fail. A Fail automatically records a **backlog** that stays until cleared.
- **Semester end**: students request; faculty approve individually or for the whole classroom. A faculty member cannot approve a student who failed *their* subject. Approval promotes the student to the next semester's classroom (Sem 8 → graduated). All history is preserved.
- **Director**: read-everything overview, per-classroom drill-downs, faculty roster with HOD designation.
- **Exports**: CSV downloads for attendance registers, marks sheets, student lists, rosters, and each student's own record.

## Deploy from scratch

1. **Supabase**: create a project, then run `supabase/migrations/0001_init.sql` in the SQL editor (or `supabase db push`). This creates the full schema, RLS policies, triggers, and seeds the 7 branches × 8 semester classrooms (no user data).
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
