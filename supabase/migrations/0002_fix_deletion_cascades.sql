-- Immutability must block user edits, not administrative account deletion.
-- Users still cannot delete attendance records (no RLS delete policy exists);
-- this only lets FK cascades proceed when an account is removed.
drop trigger attendance_records_guard on public.attendance_records;

create or replace function public.attendance_guard() returns trigger
language plpgsql as
$$
declare
  v_status public.session_status;
begin
  if current_setting('app.finalizing', true) = 'on' then
    return new;
  end if;
  select status into v_status from public.attendance_sessions
  where id = new.session_id;
  if v_status = 'finalized' then
    raise exception 'Attendance for this session is finalized and can no longer be changed';
  end if;
  if new.final_status is not null then
    raise exception 'Final attendance status can only be set when the teacher finalizes the session';
  end if;
  return new;
end;
$$;

create trigger attendance_records_guard
before insert or update on public.attendance_records
for each row execute function public.attendance_guard();

-- Keep approval history but do not block deleting a faculty account.
alter table public.semester_end_requests
  drop constraint semester_end_requests_decided_by_fkey,
  add constraint semester_end_requests_decided_by_fkey
    foreign key (decided_by) references public.faculty(id) on delete set null;
