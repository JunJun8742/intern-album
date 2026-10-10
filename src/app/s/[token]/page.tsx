import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import PhotoGrid from "@/components/PhotoGrid";

type SharedRow = {
  album_title: string;
  photo_id: string;
  storage_path: string;
  caption: string | null;
  taken_at: string;
};

export const metadata = { robots: { index: false, follow: false } };

export default function SharedAlbumPage({ params }: PageProps<"/s/[token]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Suspense fallback={<p className="text-stone-500">กำลังโหลด…</p>}>
        <SharedAlbum params={params} />
      </Suspense>
    </main>
  );
}

async function SharedAlbum({ params }: { params: PageProps<"/s/[token]">["params"] }) {
  const { token } = await params;
  // Anonymous client: access is limited to what the share functions expose.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

  const { data } = await supabase.rpc("album_shared_view", { p_token: token });
  const rows = data as SharedRow[] | null;
  if (!rows?.length) notFound();

  const { data: signed } = await supabase.storage
    .from("album-photos")
    .createSignedUrls(rows.map((r) => r.storage_path), 3600);
  const urlByPath = new Map(signed?.map((s) => [s.path, s.signedUrl]));

  return (
    <>
      <h1 className="text-2xl font-bold">{rows[0].album_title}</h1>
      <div className="mt-6">
        <PhotoGrid
          photos={rows.flatMap((r) => {
            const url = urlByPath.get(r.storage_path);
            return url
              ? [{ id: r.photo_id, url, path: r.storage_path, caption: r.caption, takenAt: r.taken_at }]
              : [];
          })}
        />
      </div>
    </>
  );
}
