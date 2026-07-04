-- subjects policy referenced subject_enrollments while subject_enrollments'
-- policy referenced subjects → infinite recursion. Break the cycle with a
-- security-definer helper that reads enrollments without RLS.

create or replace function public.my_enrolled_subject_ids() returns setof uuid
language sql stable security definer set search_path = public as
$$ select subject_id from public.subject_enrollments where student_id = auth.uid() $$;

drop policy "subjects select" on public.subjects;
create policy "subjects select" on public.subjects for select
  using (
    public.is_faculty() or public.is_director()
    or (plan_id is not null and exists (
          select 1 from public.semester_plans p
          where p.id = plan_id and p.branch_id = public.my_hod_branch()))
    or id in (select public.my_enrolled_subject_ids())
    or (plan_id is not null and exists (
          select 1 from public.semester_plans p
          join public.students st on st.id = auth.uid()
          where p.id = plan_id and p.status = 'published'
            and p.branch_id = st.branch_id))
    or classroom_id in (select public.my_classroom_ids())
  );

drop policy "sessions select" on public.attendance_sessions;
create policy "sessions select" on public.attendance_sessions for select
  using (public.is_faculty() or public.is_director()
         or subject_id in (select public.my_enrolled_subject_ids())
         or exists (select 1 from public.subjects s
                    where s.id = subject_id
                      and s.classroom_id in (select public.my_classroom_ids())));

drop policy "assessments select" on public.assessments;
create policy "assessments select" on public.assessments for select
  using (public.is_faculty() or public.is_director()
         or subject_id in (select public.my_enrolled_subject_ids())
         or exists (select 1 from public.subjects s
                    where s.id = subject_id
                      and s.classroom_id in (select public.my_classroom_ids())));

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
                              s.id in (select public.my_enrolled_subject_ids())
                              or (s.plan_id is null and s.classroom_id = public.my_classroom_id())
                            )));
