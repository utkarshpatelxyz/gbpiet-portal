"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ApproveOne({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("approve_semester_end", {
      p_request_id: requestId,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={saving}
        onClick={approve}
        className="cursor-pointer rounded-lg bg-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Approving…" : "Approve & promote"}
      </button>
      {error && <p className="max-w-72 text-right text-xs text-rose-600">{error}</p>}
    </div>
  );
}

export function ApproveAll({
  classroomId,
  count,
}: {
  classroomId: number;
  count: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function approveAll() {
    if (
      !window.confirm(
        `Approve all ${count} pending requests in this classroom? Students who failed your subject will be skipped.`
      )
    )
      return;
    setSaving(true);
    setResult(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("approve_semester_end_bulk", {
      p_classroom_id: classroomId,
    });
    setSaving(false);
    if (error) {
      setResult(error.message);
    } else {
      setResult(
        `Approved ${data.approved}, skipped ${data.skipped} (backlog in your subject).`
      );
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {result && <p className="text-xs text-slate-600">{result}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={approveAll}
        className="cursor-pointer rounded-lg border border-emerald-600 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 transition-colors duration-200 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Working…" : "Approve whole classroom"}
      </button>
    </div>
  );
}
