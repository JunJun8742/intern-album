"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function newToken() {
  return (crypto.randomUUID() + crypto.randomUUID()).replaceAll("-", "");
}

export default function ShareControl({
  albumId,
  initialToken,
}: {
  albumId: string;
  initialToken: string | null;
}) {
  const [token, setToken] = useState(initialToken);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function setShare(next: string | null) {
    setBusy(true);
    setError("");
    const { error } = await createClient()
      .from("album_albums")
      .update({ share_token: next })
      .eq("id", albumId);
    setBusy(false);
    if (error) return setError("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    setToken(next);
    setCopied(false);
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("คัดลอกไม่ได้ กดค้างที่ลิงก์เพื่อคัดลอกเอง");
    }
  }

  if (!token) {
    return (
      <div>
        <button
          disabled={busy}
          onClick={() => setShare(newToken())}
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
        >
          แชร์อัลบั้มนี้
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  const url = `${window.location.origin}/s/${token}`;
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
      <p className="text-stone-500">ใครมีลิงก์นี้ก็ดูอัลบั้มได้ (ดูอย่างเดียว)</p>
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="mt-2 w-full rounded-md border border-stone-200 bg-stone-50 px-2 py-2 text-xs"
      />
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => copy(url)}
          className="rounded-lg bg-stone-900 px-3 py-2 text-white"
        >
          {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
        </button>
        <button
          disabled={busy}
          onClick={() => setShare(null)}
          className="rounded-lg border border-stone-300 px-3 py-2 disabled:opacity-50"
        >
          ยกเลิกการแชร์
        </button>
      </div>
      {error && <p className="mt-2 text-red-600">{error}</p>}
    </div>
  );
}
