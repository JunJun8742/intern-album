import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function createAlbum(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.from("album_albums").insert({ title, owner_id: user.id });
  revalidatePath("/");
}

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-bold">บันทึกฝึกงาน</h1>
      <Suspense fallback={<p className="mt-6 text-stone-500">กำลังโหลด…</p>}>
        <Albums />
      </Suspense>
    </main>
  );
}

async function Albums() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: albums } = await supabase
    .from("album_albums")
    .select("id, title, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <form action={createAlbum} className="mt-6 flex gap-2">
        <input
          name="title"
          required
          placeholder="ชื่ออัลบั้ม เช่น สัปดาห์ที่ 1"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-3 text-base"
        />
        <button className="rounded-lg bg-stone-900 px-4 py-3 font-medium text-white">
          สร้าง
        </button>
      </form>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {albums?.map((a) => (
          <li key={a.id}>
            <Link
              href={`/albums/${a.id}`}
              className="block rounded-xl border border-stone-200 bg-white p-4 active:bg-stone-100"
            >
              <div className="font-medium">{a.title}</div>
              <div className="mt-1 text-xs text-stone-500">
                {new Date(a.created_at).toLocaleDateString("th-TH")}
              </div>
            </Link>
          </li>
        ))}
        {albums?.length === 0 && (
          <li className="text-stone-500">ยังไม่มีอัลบั้ม สร้างอัลบั้มแรกได้เลย</li>
        )}
      </ul>
    </>
  );
}
