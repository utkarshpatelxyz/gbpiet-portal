export function classroomLabel(
  branchName: string,
  year: number,
  semester: number
) {
  return `${branchName} — Year ${year} — Semester ${semester}`;
}

export function shortClassroomLabel(
  branchCode: string,
  year: number,
  semester: number
) {
  return `${branchCode} · Y${year} · S${semester}`;
}

export function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function todayISO() {
  const now = new Date();
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function pct(part: number, total: number) {
  if (total === 0) return null;
  return Math.round((part / total) * 1000) / 10;
}
