-- ============================================================
-- University / Institute Management System — initial schema
-- G.B. Pant Institute of Engineering and Technology
-- ============================================================

-- ---------- Enums ----------
create type public.user_role as enum ('student', 'faculty', 'director');
create type public.student_status as enum ('active', 'graduated');
create type public.attendance_self_status as enum ('present', 'on_leave');
create type public.attendance_final_status as enum ('present', 'absent', 'on_leave');
create type public.session_status as enum ('open', 'finalized');
create type public.assessment_type as enum ('class_test', 'final');
create type public.request_status as enum ('pending', 'approved', 'rejected');
create type public.backlog_status as enum ('pending', 'cleared');

-- ---------- Core tables ----------

create table public.branches (
  id serial primary key,
  name text not null unique,
  code text not null unique
);

-- One classroom per branch per semester. year is derived from semester.
create table public.classrooms (
  id serial primary key,
  branch_id int not null references public.branches(id) on delete cascade,
  year int not null check (year between 1 and 4),
  semester int not null check (semester between 1 and 8),
  unique (branch_id, semester),
  check (year = ((semester + 1) / 2))
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key references public.profiles(id) on delete cascade,
  enrollment_no text not null unique,
  roll_no text not null unique,
  classroom_id int references public.classrooms(id),
  status public.student_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.faculty (
  id uuid primary key references public.profiles(id) on delete cascade,
  branch_id int references public.branches(id),
  is_hod boolean not null default false,
  created_at timestamptz not null default now()
);

-- Historical record of every classroom a student has belonged to.
create table public.classroom_history (
  id bigserial primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  classroom_id int not null references public.classrooms(id),
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  classroom_id int not null references public.classrooms(id),
  faculty_id uuid not null references public.faculty(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (classroom_id, code)
);

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  session_date date not null,
  status public.session_status not null default 'open',
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subject_id, session_date)
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  self_status public.attendance_self_status,
  self_marked_at timestamptz,
  final_status public.attendance_final_status,
  unique (session_id, student_id)
);

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  title text not null,
  type public.assessment_type not null,
  max_marks numeric not null check (max_marks > 0),
  created_at timestamptz not null default now()
);

create table public.marks (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  marks_obtained numeric not null check (marks_obtained >= 0),
  passed boolean,
  updated_at timestamptz not null default now(),
  unique (assessment_id, student_id)
);

create table public.backlogs (
  id bigserial primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  status public.backlog_status not null default 'pending',
  created_at timestamptz not null default now(),
  cleared_at timestamptz,
  unique (student_id, subject_id)
);

create table public.semester_end_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  classroom_id int not null references public.classrooms(id),
  status public.request_status not null default 'pending',
  requested_at timestamptz not null default now(),
  decided_by uuid references public.faculty(id),
  decided_at timestamptz,
  unique (student_id, classroom_id)
);

create index on public.students (classroom_id);
create index on public.subjects (classroom_id);
create index on public.subjects (faculty_id);
create index on public.attendance_sessions (subject_id);
create index on public.attendance_records (session_id);
create index on public.attendance_records (student_id);
create index on public.marks (student_id);
create index on public.semester_end_requests (classroom_id, status);
create index on public.classroom_history (student_id);

-- ---------- Seed structural data (branches + classrooms; NOT user data) ----------
insert into public.branches (name, code) values
  ('Mechanical Engineering', 'ME'),
  ('Electrical Engineering', 'EE'),
  ('Biotechnology', 'BT'),
  ('Electronics and Communication Engineering', 'ECE'),
  ('Computer Science and Engineering', 'CSE'),
  ('Civil Engineering', 'CE'),
  ('Computer Science and Engineering (Artificial Intelligence)', 'CSE-AI');

insert into public.classrooms (branch_id, year, semester)
select b.id, (s + 1) / 2, s
from public.branches b, generate_series(1, 8) s;

-- ---------- Helper functions ----------

create or replace function public.my_role() returns public.user_role
language sql stable security definer set search_path = public as
$$ select role from public.profiles where id = auth.uid() $$;

create or replace function public.is_faculty() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'faculty') $$;

create or replace function public.is_director() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'director') $$;

create or replace function public.my_classroom_id() returns int
language sql stable security definer set search_path = public as
$$ select classroom_id from public.students where id = auth.uid() $$;

-- Classrooms this student has ever been part of (for historical data access).
create or replace function public.my_classroom_ids() returns setof int
language sql stable security definer set search_path = public as
$$ select classroom_id from public.classroom_history where student_id = auth.uid()
   union select classroom_id from public.students where id = auth.uid() and classroom_id is not null $$;

-- ---------- Registration ----------

-- Pre-registration uniqueness check, callable without an account.
create or replace function public.student_identifiers_available(p_enrollment text, p_roll text)
returns jsonb language sql stable security definer set search_path = public as
$$ select jsonb_build_object(
     'enrollment_taken', exists (select 1 from public.students where enrollment_no = p_enrollment),
     'roll_taken',       exists (select 1 from public.students where roll_no = p_roll)
   ) $$;

-- Create profile + role rows from auth metadata on signup.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', '');
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_classroom int;
begin
  if v_role not in ('student', 'faculty') then
    raise exception 'Registration must specify a role of student or faculty';
  end if;
  if length(trim(v_name)) < 2 then
    raise exception 'Full name is required';
  end if;

  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role::public.user_role, trim(v_name), new.email);

  if v_role = 'student' then
    v_classroom := (new.raw_user_meta_data ->> 'classroom_id')::int;
    if v_classroom is null or not exists (select 1 from public.classrooms where id = v_classroom) then
      raise exception 'A valid classroom (branch, year, semester) is required';
    end if;
    if coalesce(new.raw_user_meta_data ->> 'enrollment_no', '') = ''
       or coalesce(new.raw_user_meta_data ->> 'roll_no', '') = '' then
      raise exception 'Enrollment number and roll number are required';
    end if;
    insert into public.students (id, enrollment_no, roll_no, classroom_id)
    values (new.id,
            trim(new.raw_user_meta_data ->> 'enrollment_no'),
            trim(new.raw_user_meta_data ->> 'roll_no'),
            v_classroom);
    insert into public.classroom_history (student_id, classroom_id) values (new.id, v_classroom);
  else
    insert into public.faculty (id, branch_id)
    values (new.id, nullif(new.raw_user_meta_data ->> 'branch_id', '')::int);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Prevent users from escalating their own role via profile updates.
create or replace function public.prevent_role_change() returns trigger
language plpgsql as
$$
begin
  if current_user <> 'service_role' and new.role is distinct from old.role then
    raise exception 'Role cannot be changed';
  end if;
  return new;
end;
$$;

create trigger profiles_no_role_change
before update on public.profiles
for each row execute function public.prevent_role_change();

-- ---------- Attendance immutability ----------

-- Set inside finalize_attendance() so its writes bypass the immutability guard.
create or replace function public.attendance_guard() returns trigger
language plpgsql as
$$
declare
  v_status public.session_status;
begin
  if current_setting('app.finalizing', true) = 'on' then
    return coalesce(new, old);
  end if;
  select status into v_status from public.attendance_sessions
  where id = coalesce(new.session_id, old.session_id);
  if v_status = 'finalized' then
    raise exception 'Attendance for this session is finalized and can no longer be changed';
  end if;
  if tg_op = 'UPDATE' and (old.final_status is not null or new.final_status is not null) then
    raise exception 'Final attendance status can only be set when the teacher finalizes the session';
  end if;
  if tg_op = 'INSERT' and new.final_status is not null then
    raise exception 'Final attendance status can only be set when the teacher finalizes the session';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger attendance_records_guard
before insert or update or delete on public.attendance_records
for each row execute function public.attendance_guard();

create or replace function public.session_guard() returns trigger
language plpgsql as
$$
begin
  if current_setting('app.finalizing', true) = 'on' then
    return new;
  end if;
  if old.status = 'finalized' then
    raise exception 'A finalized attendance session cannot be modified';
  end if;
  if new.status = 'finalized' then
    raise exception 'Sessions can only be finalized through finalize_attendance()';
  end if;
  return new;
end;
$$;

create trigger attendance_sessions_guard
before update on public.attendance_sessions
for each row execute function public.session_guard();

-- Teacher finalization: writes final statuses for every student and locks the session.
-- p_finals: [{"student_id": "...", "final_status": "present|absent|on_leave"}, ...]
create or replace function public.finalize_attendance(p_session_id uuid, p_finals jsonb)
returns void language plpgsql security definer set search_path = public as
$$
declare
  v_subject public.subjects%rowtype;
  v_session public.attendance_sessions%rowtype;
  v_item jsonb;
  v_student uuid;
  v_status public.attendance_final_status;
  v_expected int;
  v_written int := 0;
begin
  select * into v_session from public.attendance_sessions where id = p_session_id for update;
  if not found then raise exception 'Attendance session not found'; end if;
  if v_session.status = 'finalized' then raise exception 'This session is already finalized'; end if;

  select * into v_subject from public.subjects where id = v_session.subject_id;
  if v_subject.faculty_id <> auth.uid() then
    raise exception 'Only the faculty who teaches this subject can finalize attendance';
  end if;

  select count(*) into v_expected from public.students
  where classroom_id = v_subject.classroom_id and status = 'active';

  perform set_config('app.finalizing', 'on', true);

  for v_item in select * from jsonb_array_elements(p_finals) loop
    v_student := (v_item ->> 'student_id')::uuid;
    v_status := (v_item ->> 'final_status')::public.attendance_final_status;
    if not exists (select 1 from public.students
                   where id = v_student and classroom_id = v_subject.classroom_id) then
      raise exception 'Student % is not in this classroom', v_student;
    end if;
    insert into public.attendance_records (session_id, student_id, final_status)
    values (p_session_id, v_student, v_status)
    on conflict (session_id, student_id) do update set final_status = excluded.final_status;
    v_written := v_written + 1;
  end loop;

  if v_written < v_expected then
    raise exception 'All % students must be given a final status (got %)', v_expected, v_written;
  end if;

  update public.attendance_sessions
  set status = 'finalized', finalized_at = now()
  where id = p_session_id;

  perform set_config('app.finalizing', 'off', true);
end;
$$;

-- ---------- Backlogs from final exam results ----------

create or replace function public.sync_backlog() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_type public.assessment_type;
  v_subject uuid;
begin
  select a.type, a.subject_id into v_type, v_subject
  from public.assessments a where a.id = new.assessment_id;
  if v_type = 'final' then
    if new.passed = false then
      insert into public.backlogs (student_id, subject_id)
      values (new.student_id, v_subject)
      on conflict (student_id, subject_id)
      do update set status = 'pending', cleared_at = null;
    elsif new.passed = true then
      update public.backlogs set status = 'cleared', cleared_at = now()
      where student_id = new.student_id and subject_id = v_subject and status = 'pending';
    end if;
  end if;
  return new;
end;
$$;

create trigger marks_sync_backlog
after insert or update on public.marks
for each row execute function public.sync_backlog();

-- ---------- Semester end & promotion ----------

create or replace function public.request_semester_end()
returns void language plpgsql security definer set search_path = public as
$$
declare
  v_classroom int;
begin
  select classroom_id into v_classroom from public.students
  where id = auth.uid() and status = 'active';
  if v_classroom is null then
    raise exception 'Only an active student can request semester end';
  end if;
  insert into public.semester_end_requests (student_id, classroom_id)
  values (auth.uid(), v_classroom)
  on conflict (student_id, classroom_id) do nothing;
end;
$$;

-- Promote one student out of the given classroom into the next semester's classroom.
create or replace function public._promote(p_student uuid, p_classroom int)
returns void language plpgsql security definer set search_path = public as
$$
declare
  v_next int;
  v_branch int;
  v_sem int;
begin
  select branch_id, semester into v_branch, v_sem from public.classrooms where id = p_classroom;
  update public.classroom_history set left_at = now()
  where student_id = p_student and classroom_id = p_classroom and left_at is null;
  if v_sem >= 8 then
    update public.students set classroom_id = null, status = 'graduated' where id = p_student;
  else
    select id into v_next from public.classrooms
    where branch_id = v_branch and semester = v_sem + 1;
    update public.students set classroom_id = v_next where id = p_student;
    insert into public.classroom_history (student_id, classroom_id) values (p_student, v_next);
  end if;
end;
$$;

-- Approve a single request. The approving faculty is blocked if the student
-- failed THAT faculty's subject (pending backlog in one of their subjects in
-- this classroom); the student keeps the backlog and another faculty may approve.
create or replace function public.approve_semester_end(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as
$$
declare
  v_req public.semester_end_requests%rowtype;
begin
  select * into v_req from public.semester_end_requests where id = p_request_id for update;
  if not found or v_req.status <> 'pending' then
    raise exception 'Request not found or already decided';
  end if;
  if not exists (select 1 from public.subjects
                 where classroom_id = v_req.classroom_id and faculty_id = auth.uid()) then
    raise exception 'Only faculty teaching in this classroom can approve semester end';
  end if;
  if exists (select 1
             from public.backlogs b
             join public.subjects s on s.id = b.subject_id
             where b.student_id = v_req.student_id
               and b.status = 'pending'
               and s.faculty_id = auth.uid()
               and s.classroom_id = v_req.classroom_id) then
    raise exception 'This student failed your subject and has a pending backlog. Another faculty member of this classroom must approve their promotion; the backlog stays on record until cleared.';
  end if;

  update public.semester_end_requests
  set status = 'approved', decided_by = auth.uid(), decided_at = now()
  where id = p_request_id;

  perform public._promote(v_req.student_id, v_req.classroom_id);
end;
$$;

-- Bulk approval for a whole classroom. Skips students who fail the approver's
-- own-subject gate; returns counts.
create or replace function public.approve_semester_end_bulk(p_classroom_id int)
returns jsonb language plpgsql security definer set search_path = public as
$$
declare
  v_req record;
  v_approved int := 0;
  v_skipped int := 0;
begin
  if not exists (select 1 from public.subjects
                 where classroom_id = p_classroom_id and faculty_id = auth.uid()) then
    raise exception 'Only faculty teaching in this classroom can approve semester end';
  end if;
  for v_req in
    select * from public.semester_end_requests
    where classroom_id = p_classroom_id and status = 'pending'
    for update
  loop
    if exists (select 1
               from public.backlogs b
               join public.subjects s on s.id = b.subject_id
               where b.student_id = v_req.student_id
                 and b.status = 'pending'
                 and s.faculty_id = auth.uid()
                 and s.classroom_id = p_classroom_id) then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    update public.semester_end_requests
    set status = 'approved', decided_by = auth.uid(), decided_at = now()
    where id = v_req.id;
    perform public._promote(v_req.student_id, v_req.classroom_id);
    v_approved := v_approved + 1;
  end loop;
  return jsonb_build_object('approved', v_approved, 'skipped', v_skipped);
end;
$$;

-- ---------- Row Level Security ----------

alter table public.branches enable row level security;
alter table public.classrooms enable row level security;
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.faculty enable row level security;
alter table public.classroom_history enable row level security;
alter table public.subjects enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.assessments enable row level security;
alter table public.marks enable row level security;
alter table public.backlogs enable row level security;
alter table public.semester_end_requests enable row level security;

-- Branches & classrooms: readable by everyone (needed on the registration form).
create policy "branches readable" on public.branches for select using (true);
create policy "classrooms readable" on public.classrooms for select using (true);

-- Profiles: any signed-in member of the institute can see names; users update
-- their own profile (role changes blocked by trigger).
create policy "profiles select" on public.profiles for select
  using (auth.uid() is not null);
create policy "profiles update own" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Students: self, faculty, director.
create policy "students select" on public.students for select
  using (id = auth.uid() or public.is_faculty() or public.is_director());

-- Faculty roster: visible to all signed-in users.
create policy "faculty select" on public.faculty for select
  using (auth.uid() is not null);
create policy "faculty update own" on public.faculty for update
  using (id = auth.uid()) with check (id = auth.uid());

-- Classroom history: self, faculty, director.
create policy "history select" on public.classroom_history for select
  using (student_id = auth.uid() or public.is_faculty() or public.is_director());

-- Subjects: students see subjects of classrooms they belong(ed) to;
-- faculty and director see all. Faculty manage their own subjects.
create policy "subjects select" on public.subjects for select
  using (public.is_faculty() or public.is_director()
         or classroom_id in (select public.my_classroom_ids()));
create policy "subjects insert" on public.subjects for insert
  with check (public.is_faculty() and faculty_id = auth.uid());
create policy "subjects update own" on public.subjects for update
  using (faculty_id = auth.uid()) with check (faculty_id = auth.uid());
create policy "subjects delete own" on public.subjects for delete
  using (faculty_id = auth.uid());

-- Attendance sessions: visible to the subject's classroom students (incl. past),
-- all faculty, and director. Created only by the subject's own faculty.
create policy "sessions select" on public.attendance_sessions for select
  using (public.is_faculty() or public.is_director()
         or exists (select 1 from public.subjects s
                    where s.id = subject_id
                      and s.classroom_id in (select public.my_classroom_ids())));
create policy "sessions insert" on public.attendance_sessions for insert
  with check (exists (select 1 from public.subjects s
                      where s.id = subject_id and s.faculty_id = auth.uid()));
create policy "sessions delete own open" on public.attendance_sessions for delete
  using (status = 'open'
         and exists (select 1 from public.subjects s
                     where s.id = subject_id and s.faculty_id = auth.uid()));

-- Attendance records: students see their own; the subject's faculty and the
-- director see all rows of the session. Students may insert/update ONLY their
-- own self-mark while the session is open (trigger enforces final immutability).
create policy "records select" on public.attendance_records for select
  using (student_id = auth.uid() or public.is_director()
         or exists (select 1 from public.attendance_sessions se
                    join public.subjects s on s.id = se.subject_id
                    where se.id = session_id and s.faculty_id = auth.uid()));
create policy "records self insert" on public.attendance_records for insert
  with check (student_id = auth.uid()
              and final_status is null
              and self_status is not null
              and exists (select 1 from public.attendance_sessions se
                          join public.subjects s on s.id = se.subject_id
                          join public.students st on st.id = auth.uid()
                          where se.id = session_id
                            and se.status = 'open'
                            and st.classroom_id = s.classroom_id));
create policy "records self update" on public.attendance_records for update
  using (student_id = auth.uid()
         and final_status is null
         and exists (select 1 from public.attendance_sessions se
                     where se.id = session_id and se.status = 'open'))
  with check (student_id = auth.uid() and final_status is null and self_status is not null);

-- Assessments: same visibility as subjects; managed by owning faculty.
create policy "assessments select" on public.assessments for select
  using (public.is_faculty() or public.is_director()
         or exists (select 1 from public.subjects s
                    where s.id = subject_id
                      and s.classroom_id in (select public.my_classroom_ids())));
create policy "assessments insert" on public.assessments for insert
  with check (exists (select 1 from public.subjects s
                      where s.id = subject_id and s.faculty_id = auth.uid()));
create policy "assessments update own" on public.assessments for update
  using (exists (select 1 from public.subjects s
                 where s.id = subject_id and s.faculty_id = auth.uid()));
create policy "assessments delete own" on public.assessments for delete
  using (exists (select 1 from public.subjects s
                 where s.id = subject_id and s.faculty_id = auth.uid()));

-- Marks: students see their own; owning faculty manage; director reads.
create policy "marks select" on public.marks for select
  using (student_id = auth.uid() or public.is_director()
         or exists (select 1 from public.assessments a
                    join public.subjects s on s.id = a.subject_id
                    where a.id = assessment_id and s.faculty_id = auth.uid()));
create policy "marks insert" on public.marks for insert
  with check (exists (select 1 from public.assessments a
                      join public.subjects s on s.id = a.subject_id
                      where a.id = assessment_id and s.faculty_id = auth.uid()));
create policy "marks update own" on public.marks for update
  using (exists (select 1 from public.assessments a
                 join public.subjects s on s.id = a.subject_id
                 where a.id = assessment_id and s.faculty_id = auth.uid()));

-- Backlogs: student sees own; faculty and director see all.
create policy "backlogs select" on public.backlogs for select
  using (student_id = auth.uid() or public.is_faculty() or public.is_director());

-- Semester end requests: student sees own; faculty and director see all.
-- Writes happen only through the security-definer RPCs.
create policy "requests select" on public.semester_end_requests for select
  using (student_id = auth.uid() or public.is_faculty() or public.is_director());

-- ---------- Grants ----------
grant usage on schema public to anon, authenticated;
grant select on public.branches, public.classrooms to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.student_identifiers_available(text, text) to anon, authenticated;
grant execute on function public.finalize_attendance(uuid, jsonb) to authenticated;
grant execute on function public.request_semester_end() to authenticated;
grant execute on function public.approve_semester_end(uuid) to authenticated;
grant execute on function public.approve_semester_end_bulk(int) to authenticated;
