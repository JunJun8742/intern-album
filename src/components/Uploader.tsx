"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { preparePhoto } from "@/lib/image";

type Item = { name: string; status: "รอ" | "กำลังอัปโหลด" | "เสร็จ" | "ผิดพลาด" };

export default function Uploader({ albumId, ownerId }: { albumId: string; ownerId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);

  function setStatus(i: number, status: Item["status"]) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, status } : it)));
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setItems(files.map((f) => ({ name: f.name, status: "รอ" })));

    const supabase = createClient();
    for (let i = 0; i < files.length; i++) {
      setStatus(i, "กำลังอัปโหลด");
      try {
        const { file, takenAt } = await preparePhoto(files[i]);
        const path = `${ownerId}/${albumId}/${crypto.randomUUID()}.jpg`;
        const up = await supabase.storage
          .from("album-photos")
          .upload(path, file, { contentType: "image/jpeg" });
        if (up.error) throw up.error;
        const ins = await supabase.from("album_photos").insert({
          album_id: albumId,
          owner_id: ownerId,
          storage_path: path,
          taken_at: takenAt.toISOString(),
        });
        if (ins.error) throw ins.error;
        setStatus(i, "เสร็จ");
      } catch {
        setStatus(i, "ผิดพลาด");
      }
    }
    router.refresh();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        onChange={onPick}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl bg-stone-900 px-4 py-4 text-base font-medium text-white active:bg-stone-700"
      >
        + เพิ่มรูป
      </button>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm">
          {items.map((it, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="truncate text-stone-600">{it.name}</span>
              <span className={it.status === "ผิดพลาด" ? "text-red-600" : "text-stone-500"}>
                {it.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
