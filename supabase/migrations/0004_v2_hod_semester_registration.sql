-- ============================================================
-- V2: HOD role, semester subject planning + publication,
-- student semester registration (replaces the old semester-end
-- migration flow), passing marks, single final exam,
-- re-appearance attempts, labs, faculty profiles.
-- ============================================================

-- ---------- HOD ----------
create table public.hods (
  id uuid primary key references public.profiles(id) on delete cascade,
  branch_id int not null references public.branches(id) unique,
  created_at timestamptz not null default now()
);

create or replace function public.is_hod_role() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'hod') $$;

create or replace function public.my_hod_branch() returns int
language sql stable security definer set search_path = public as
$$ select branch_id from public.hods where id = auth.uid() $$;

-- ---------- Students now carry their branch; placement comes from registration ----------
alter table public.students add column branch_id int references public.branches(id);
update public.students st
set branch_id = c.branch_id
from public.classrooms c
where st.classroom_id = c.id and st.branch_id is null;

-- ---------- Semester plans ----------
create type public.plan_status as enum ('draft', 'published');
create type public.subject_kind as enum ('fixed', 'elective');

create table public.semester_plans (
  id uuid primary key default gen_random_uuid(),
  branch_id int not null references public.branches(id),
  semester int not null check (semester between 1 and 8),
  status public.plan_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.hods(id),
  created_at timestamptz not null default now(),
  unique (branch_id, semester)
);

-- Subjects are now authored by the HOD inside a plan. Legacy rows keep plan_id null.
alter table public.subjects
  add column plan_id uuid references public.semester_plans(id) on delete cascade,
  add column kind public.subject_kind not null default 'fixed',
  add column is_lab boolean not null default false,
  add column parent_subject_id uuid references public.subjects(id) on delete set null;

-- ---------- Enrollment & registration ----------
create table public.subject_enrollments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (subject_id, student_id)
);
create index on public.subject_enrollments (student_id);

create table public.semester_registrations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  plan_id uuid not null references public.semester_plans(id) on delete cascade,
  submitted_at timestamptz not null default now(),
  unique (student_id, plan_id)
);

-- ---------- Assessments: passing marks + single final ----------
alter table public.assessments
  add column passing_marks numeric not null default 0 check (passing_marks >= 0);
create unique index assessments_one_final_per_subject
  on public.assessments (subject_id) where (type = 'final');

-- Pass/fail is computed by the database from passing marks.
create or replace function public.marks_compute_passed() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_pass numeric;
begin
  select passing_marks into v_pass from public.assessments where id = new.assessment_id;
  new.passed := new.marks_obtained >= coalesce(v_pass, 0);
  return new;
end;
$$;

create trigger marks_a_compute_passed
before insert or update on public.marks
for each row execute function public.marks_compute_passed();

-- ---------- Re-appearance attempts (fresh max/pass marks, history preserved) ----------
create table public.final_attempts (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  max_marks numeric not null check (max_marks > 0),
  passing_marks numeric not null check (passing_marks >= 0),
  marks_obtained numeric not null check (marks_obtained >= 0),
  passed boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.final_attempts (subject_id, student_id);

create or replace function public.attempt_compute_passed() returns trigger
language plpgsql security definer set search_path = public as
$$
begin
  new.passed := new.marks_obtained >= new.passing_marks;
  if new.passed then
    update public.backlogs set status = 'cleared', cleared_at = now()
    where student_id = new.student_id and subject_id = new.subject_id and status = 'pending';
  end if;
  return new;
end;
$$;

create trigger final_attempts_compute
before insert on public.final_attempts
for each row execute function public.attempt_compute_passed();

-- ---------- Faculty profiles ----------
alter table public.faculty
  add column designations jsonb not null default '[]',
  add column expertise jsonb not null default '[]',
  add column education jsonb not null default '[]',
  add column awards jsonb not null default '[]';

-- ---------- Registration trigger: student picks branch only; add HOD role ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', '');
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_branch int := nullif(new.raw_user_meta_data ->> 'branch_id', '')::int;
begin
  if v_role not in ('student', 'faculty', 'hod') then
    raise exception 'Registration must specify a role of student, faculty, or hod';
  end if;
  if length(trim(v_name)) < 2 then
    raise exception 'Full name is required';
  end if;
  if v_branch is null or not exists (select 1 from public.branches where id = v_branch) then
    raise exception 'A valid department / branch is required';
  end if;

  insert into public.profiles (id, role, full_name, email)
  values (new.id, v_role::public.user_role, trim(v_name), new.email);

  if v_role = 'student' then
    if coalesce(new.raw_user_meta_data ->> 'enrollment_no', '') = ''
       or coalesce(new.raw_user_meta_data ->> 'roll_no', '') = '' then
      raise exception 'Enrollment number and roll number are required';
    end if;
    insert into public.students (id, enrollment_no, roll_no, branch_id)
    values (new.id,
            trim(new.raw_user_meta_data ->> 'enrollment_no'),
            trim(new.raw_user_meta_data ->> 'roll_no'),
            v_branch);
  elsif v_role = 'faculty' then
    insert into public.faculty (id, branch_id) values (new.id, v_branch);
  else
    insert into public.hods (id, branch_id) values (new.id, v_branch);
  end if;
  return new;
end;
$$;

-- ---------- Semester registration RPC (this IS the migration between semesters) ----------
create or replace function public.register_semester(p_plan_id uuid, p_elective_ids uuid[] default '{}')
returns void language plpgsql security definer set search_path = public as
$$
declare
  v_student public.students%rowtype;
  v_plan public.semester_plans%rowtype;
  v_current_sem int;
  v_classroom int;
  v_subject record;
  v_chosen uuid[] := '{}';
begin
  select * into v_student from public.students where id = auth.uid() and status = 'active';
  if not found then raise exception 'Only an active student can register for a semester'; end if;

  select * into v_plan from public.semester_plans where id = p_plan_id;
  if not found or v_plan.status <> 'published' then
    raise exception 'This semester plan is not published';
  end if;
  if v_plan.branch_id <> v_student.branch_id then
    raise exception 'This plan belongs to a different department';
  end if;

  select c.semester into v_current_sem from public.classrooms c where c.id = v_student.classroom_id;
  if v_current_sem is null then
    if v_plan.semester <> 1 then
      raise exception 'You must start with Semester 1 registration';
    end if;
  elsif v_plan.semester <> v_current_sem + 1 then
    raise exception 'You are in Semester % and can only register for Semester %',
      v_current_sem, v_current_sem + 1;
  end if;

  if exists (select 1 from public.semester_registrations
             where student_id = v_student.id and plan_id = p_plan_id) then
    raise exception 'You have already registered for this semester';
  end if;

  -- Core selection: all fixed non-lab subjects + validated electives.
  for v_subject in
    select id, kind, is_lab, parent_subject_id from public.subjects where plan_id = p_plan_id
  loop
    if not v_subject.is_lab and
       (v_subject.kind = 'fixed' or v_subject.id = any(p_elective_ids)) then
      v_chosen := array_append(v_chosen, v_subject.id);
    end if;
  end loop;

  -- Labs: standalone fixed labs, standalone elective labs the student picked,
  -- and labs linked to any chosen subject.
  for v_subject in
    select id, kind, parent_subject_id from public.subjects
    where plan_id = p_plan_id and is_lab
  loop
    if (v_subject.parent_subject_id is null and
        (v_subject.kind = 'fixed' or v_subject.id = any(p_elective_ids)))
       or (v_subject.parent_subject_id = any(v_chosen)) then
      v_chosen := array_append(v_chosen, v_subject.id);
    end if;
  end loop;

  if array_length(v_chosen, 1) is null then
    raise exception 'This plan has no subjects yet';
  end if;

  insert into public.semester_registrations (student_id, plan_id)
  values (v_student.id, p_plan_id);

  insert into public.subject_enrollments (subject_id, student_id)
  select unnest(v_chosen), v_student.id
  on conflict do nothing;

  -- Move the student into the semester's classroom (history preserved).
  select id into v_classroom from public.classrooms
  where branch_id = v_plan.branch_id and semester = v_plan.semester;

  update public.classroom_history set left_at = now()
  where student_id = v_student.id and left_at is null;
  update public.students set classroom_id = v_classroom where id = v_student.id;
  insert into public.classroom_history (student_id, classroom_id)
  values (v_student.id, v_classroom);
end;
$$;

-- ---------- Finalize attendance: expected roster = enrolled students ----------
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

  if v_subject.plan_id is not null then
    select count(*) into v_expected from public.subject_enrollments e
    join public.students st on st.id = e.student_id
    where e.subject_id = v_subject.id and st.status = 'active';
  else
    select count(*) into v_expected from public.students
    where classroom_id = v_subject.classroom_id and status = 'active';
  end if;

  perform set_config('app.finalizing', 'on', true);

  for v_item in select * from jsonb_array_elements(p_finals) loop
    v_student := (v_item ->> 'student_id')::uuid;
    v_status := (v_item ->> 'final_status')::public.attendance_final_status;
    if v_subject.plan_id is not null then
      if not exists (select 1 from public.subject_enrollments
                     where subject_id = v_subject.id and student_id = v_student) then
        raise exception 'Student % is not enrolled in this subject', v_student;
      end if;
    elsif not exists (select 1 from public.students
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

-- ---------- Remove the old semester-end flow ----------
drop function if exists public.request_semester_end();
drop function if exists public.approve_semester_end(uuid);
drop function if exists public.approve_semester_end_bulk(int);
drop table if exists public.semester_end_requests;

-- ---------- RLS ----------
alter table public.hods enable row level security;
alter table public.semester_plans enable row level security;
alter table public.subject_enrollments enable row level security;
alter table public.semester_registrations enable row level security;
alter table public.final_attempts enable row level security;

create policy "hods select" on public.hods for select using (auth.uid() is not null);

-- Plans: HOD manages own department; everyone signed-in reads published plans.
create policy "plans select" on public.semester_plans for select
  using (status = 'published' or branch_id = public.my_hod_branch() or public.is_director());
create policy "plans insert" on public.semester_plans for insert
  with check (branch_id = public.my_hod_branch() and created_by = auth.uid());
create policy "plans update" on public.semester_plans for update
  using (branch_id = public.my_hod_branch())
  with check (branch_id = public.my_hod_branch());
create policy "plans delete" on public.semester_plans for delete
  using (branch_id = public.my_hod_branch() and status = 'draft');

-- Subjects: authored by the HOD now. Faculty no longer create subjects.
drop policy "subjects insert" on public.subjects;
drop policy "subjects update own" on public.subjects;
drop policy "subjects delete own" on public.subjects;
drop policy "subjects select" on public.subjects;

create policy "subjects select" on public.subjects for select
  using (
    public.is_faculty() or public.is_director()
    or (plan_id is not null and exists (
          select 1 from public.semester_plans p
          where p.id = plan_id and p.branch_id = public.my_hod_branch()))
    or exists (select 1 from public.subject_enrollments e
               where e.subject_id = id and e.student_id = auth.uid())
    or (plan_id is not null and exists (
          select 1 from public.semester_plans p
          join public.students st on st.id = auth.uid()
          where p.id = plan_id and p.status = 'published'
            and p.branch_id = st.branch_id))
    or classroom_id in (select public.my_classroom_ids())
  );
create policy "subjects hod insert" on public.subjects for insert
  with check (plan_id is not null and exists (
    select 1 from public.semester_plans p
    where p.id = plan_id and p.branch_id = public.my_hod_branch()));
create policy "subjects hod update" on public.subjects for update
  using (plan_id is not null and exists (
    select 1 from public.semester_plans p
    where p.id = plan_id and p.branch_id = public.my_hod_branch()));
create policy "subjects hod delete" on public.subjects for delete
  using (plan_id is not null and exists (
    select 1 from public.semester_plans p
    where p.id = plan_id and p.branch_id = public.my_hod_branch() and p.status = 'draft'));

-- Enrollments: written only by register_semester(); read by the student,
-- the subject's faculty, the department HOD, and the director.
create policy "enrollments select" on public.subject_enrollments for select
  using (
    student_id = auth.uid() or public.is_director()
    or exists (select 1 from public.subjects s
               where s.id = subject_id and s.faculty_id = auth.uid())
    or exists (select 1 from public.subjects s
               join public.semester_plans p on p.id = s.plan_id
               where s.id = subject_id and p.branch_id = public.my_hod_branch())
  );

create policy "registrations select" on public.semester_registrations for select
  using (student_id = auth.uid() or public.is_director()
         or exists (select 1 from public.semester_plans p
                    where p.id = plan_id and p.branch_id = public.my_hod_branch()));

-- Re-appearance attempts: entered by the subject's faculty; read by the
-- student, faculty, HOD, and director.
create policy "attempts select" on public.final_attempts for select
  using (
    student_id = auth.uid() or public.is_director() or public.is_faculty()
    or exists (select 1 from public.subjects s
               join public.semester_plans p on p.id = s.plan_id
               where s.id = subject_id and p.branch_id = public.my_hod_branch())
  );
create policy "attempts insert" on public.final_attempts for insert
  with check (exists (select 1 from public.subjects s
                      where s.id = subject_id and s.faculty_id = auth.uid()));

-- Students: HOD can see their department's students.
drop policy "students select" on public.students;
create policy "students select" on public.students for select
  using (id = auth.uid() or public.is_faculty() or public.is_director()
         or branch_id = public.my_hod_branch());

-- Sessions & assessments: students access via enrollment too.
drop policy "sessions select" on public.attendance_sessions;
create policy "sessions select" on public.attendance_sessions for select
  using (public.is_faculty() or public.is_director()
         or exists (select 1 from public.subject_enrollments e
                    where e.subject_id = attendance_sessions.subject_id
                      and e.student_id = auth.uid())
         or exists (select 1 from public.subjects s
                    where s.id = subject_id
                      and s.classroom_id in (select public.my_classroom_ids())));

drop policy "assessments select" on public.assessments;
create policy "assessments select" on public.assessments for select
  using (public.is_faculty() or public.is_director()
         or exists (select 1 from public.subject_enrollments e
                    where e.subject_id = assessments.subject_id
                      and e.student_id = auth.uid())
         or exists (select 1 from public.subjects s
                    where s.id = subject_id
                      and s.classroom_id in (select public.my_classroom_ids())));

-- Self-mark: must be enrolled (legacy classroom path kept for plan-less subjects).
drop policy "records self insert" on public.attendance_records;
create policy "records self insert" on public.attendance_records for insert
  with check (student_id = auth.uid()
              and final_status is null
              and self_status is not null
              and exists (select 1 from public.attendance_sessions se
                          join public.subjects s on s.id = se.subject_id
                          where se.id = session_id
                            and se.status = 'open'
                            and (
                              exists (select 1 from public.subject_enrollments e
                                      where e.subject_id = s.id and e.student_id = auth.uid())
                              or (s.plan_id is null and s.classroom_id = public.my_classroom_id())
                            )));

-- ---------- Grants ----------
grant select, insert, update, delete on public.hods, public.semester_plans,
  public.subject_enrollments, public.semester_registrations, public.final_attempts
  to authenticated;
grant execute on function public.register_semester(uuid, uuid[]) to authenticated;
