"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type GridPhoto = {
  id: string;
  url: string;
  path: string;
  caption: string | null;
  takenAt: string;
};

export default function PhotoGrid({
  photos,
  editable = false,
}: {
  photos: GridPhoto[];
  editable?: boolean;
}) {
  const router = useRouter();
  const [rawIndex, setIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ id: string; msg: string } | null>(null);
  const touchX = useRef<number | null>(null);

  // After a delete the list shrinks: show the previous photo, or close if none are left.
  const index =
    rawIndex === null || photos.length === 0 ? null : Math.min(rawIndex, photos.length - 1);
  const open = index !== null ? photos[index] : null;
  const caption = open ? (draft?.id === open.id ? draft.text : (open.caption ?? "")) : "";
  const error = open && failure?.id === open.id ? failure.msg : "";

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => {
        if (i === null) return i;
        const next = i + delta;
        return next < 0 || next >= photos.length ? i : next;
      });
    },
    [photos.length],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") setIndex(null);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, go]);

  async function saveCaption() {
    if (!open || !editable) return;
    const next = caption.trim() || null;
    if (next === (open.caption ?? null)) return;
    const { error } = await createClient()
      .from("album_photos")
      .update({ caption: next })
      .eq("id", open.id);
    if (error) return setFailure({ id: open.id, msg: "บันทึกคำบรรยายไม่สำเร็จ" });
    router.refresh();
  }

  async function remove() {
    if (!open || !editable) return;
    if (!window.confirm("ลบรูปนี้ถาวรใช่ไหม")) return;
    setBusy(true);
    setFailure(null);
    const supabase = createClient();
    // Delete the row first; if that works the file is orphaned at worst.
    const del = await supabase.from("album_photos").delete().eq("id", open.id);
    if (del.error) {
      setBusy(false);
      return setFailure({ id: open.id, msg: "ลบไม่สำเร็จ ลองใหม่อีกครั้ง" });
    }
    await supabase.storage.from("album-photos").remove([open.path]);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1 sm:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setIndex(i)}
            className="aspect-square w-full overflow-hidden rounded-md bg-stone-200"
            aria-label={p.caption ?? "เปิดรูป"}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
          role="dialog"
          aria-modal="true"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {(index ?? 0) + 1} / {photos.length} ·{" "}
              {new Date(open.takenAt).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <button onClick={() => setIndex(null)} className="px-2 py-1 text-base" aria-label="ปิด">
              ✕
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.url} alt={open.caption ?? ""} className="max-h-full max-w-full object-contain" />
            {(index ?? 0) > 0 && (
              <button
                onClick={() => go(-1)}
                className="absolute left-2 hidden rounded-full bg-white/15 px-3 py-2 sm:block"
                aria-label="รูปก่อนหน้า"
              >
                ‹
              </button>
            )}
            {(index ?? 0) < photos.length - 1 && (
              <button
                onClick={() => go(1)}
                className="absolute right-2 hidden rounded-full bg-white/15 px-3 py-2 sm:block"
                aria-label="รูปถัดไป"
              >
                ›
              </button>
            )}
          </div>

          <div className="space-y-2 px-4 py-3">
            {editable ? (
              <>
                <textarea
                  value={caption}
                  onChange={(e) => setDraft({ id: open.id, text: e.target.value })}
                  onBlur={saveCaption}
                  rows={2}
                  placeholder="เขียนคำบรรยาย / สิ่งที่ได้เรียนรู้วันนี้"
                  className="w-full rounded-lg bg-white/10 px-3 py-2 text-base placeholder:text-white/40"
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={remove}
                    disabled={busy}
                    className="rounded-lg border border-red-400/60 px-3 py-2 text-sm text-red-300 disabled:opacity-50"
                  >
                    ลบรูป
                  </button>
                  {error && <span className="text-sm text-red-300">{error}</span>}
                </div>
              </>
            ) : (
              open.caption && <p className="text-base">{open.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
