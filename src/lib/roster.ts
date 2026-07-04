import type { SupabaseClient } from "@supabase/supabase-js";

export type RosterStudent = {
  id: string;
  enrollment_no: string;
  roll_no: string;
  full_name: string;
};

// Enrolled students for HOD-planned subjects; classroom students for legacy rows.
export async function getSubjectRoster(
  supabase: SupabaseClient,
  subject: { id: string; plan_id: string | null; classroom_id: number }
): Promise<RosterStudent[]> {
  if (subject.plan_id) {
    const { data } = await supabase
      .from("subject_enrollments")
      .select("students(id, enrollment_no, roll_no, profiles(full_name))")
      .eq("subject_id", subject.id);
    return (data ?? [])
      .map((e) => {
        const st = e.students as unknown as {
          id: string;
          enrollment_no: string;
          roll_no: string;
          profiles: { full_name: string };
        };
        return {
          id: st.id,
          enrollment_no: st.enrollment_no,
          roll_no: st.roll_no,
          full_name: st.profiles.full_name,
        };
      })
      .sort((a, b) => a.roll_no.localeCompare(b.roll_no));
  }
  const { data } = await supabase
    .from("students")
    .select("id, enrollment_no, roll_no, profiles(full_name)")
    .eq("classroom_id", subject.classroom_id)
    .eq("status", "active")
    .order("roll_no");
  return (data ?? []).map((st) => ({
    id: st.id,
    enrollment_no: st.enrollment_no,
    roll_no: st.roll_no,
    full_name: (st.profiles as unknown as { full_name: string }).full_name,
  }));
}
