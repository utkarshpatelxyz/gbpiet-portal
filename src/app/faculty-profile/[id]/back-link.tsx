"use client";

import { useRouter } from "next/navigation";

export default function BackLink() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="cursor-pointer text-sm font-medium text-indigo-600 transition-colors duration-200 hover:text-indigo-700"
    >
      ← Back
    </button>
  );
}
