"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function claimDirector(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string }> {
  const code = String(formData.get("code") ?? "").trim();
  const expected = process.env.DIRECTOR_SETUP_CODE;
  if (!expected) {
    return { error: "Director setup is not configured on this deployment." };
  }
  if (!code || code !== expected) {
    return { error: "Invalid setup code." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  // Becoming director removes any student/faculty identity for this account.
  await admin.from("students").delete().eq("id", user.id);
  await admin.from("faculty").delete().eq("id", user.id);
  const { error } = await admin
    .from("profiles")
    .update({ role: "director" })
    .eq("id", user.id);
  if (error) return { error: error.message };
  redirect("/director");
}

export async function setHod(facultyId: string, isHod: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "director") return;
  const admin = createAdminClient();
  await admin.from("faculty").update({ is_hod: isHod }).eq("id", facultyId);
  revalidatePath("/director/faculty");
}
