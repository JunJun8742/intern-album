import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Uploader from "@/components/Uploader";
import ShareControl from "@/components/ShareControl";
import PhotoGrid from "@/components/PhotoGrid";

export default function AlbumPage({ params }: PageProps<"/albums/[id]">) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-stone-500">← อัลบั้มทั้งหมด</Link>
      <Suspense fallback={<p className="mt-6 text-stone-500">กำลังโหลด…</p>}>
        <AlbumContent params={params} />
      </Suspense>
    </main>
  );
}

async function AlbumContent({ params }: { params: PageProps<"/albums/[id]">["params"] }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: album } = await supabase
    .from("album_albums")
    .select("id, title, share_token")
    .eq("id", id)
    .maybeSingle();
  if (!album) notFound();

  const { data: photos } = await supabase
    .from("album_photos")
    .select("id, storage_path, taken_at, caption")
    .eq("album_id", id)
    .order("taken_at", { ascending: true });

  const paths = photos?.map((p) => p.storage_path) ?? [];
  const { data: signed } = paths.length
    ? await supabase.storage.from("album-photos").createSignedUrls(paths, 3600)
    : { data: [] };
  const urlByPath = new Map(signed?.map((s) => [s.path, s.signedUrl]));

  return (
    <>
      <h1 className="mt-2 text-2xl font-bold">{album.title}</h1>

      <div className="mt-4">
        <ShareControl albumId={album.id} initialToken={album.share_token} />
      </div>

      <div className="mt-6">
        <Uploader albumId={album.id} ownerId={user.id} />
      </div>

      <div className="mt-6">
        <PhotoGrid
          editable
          photos={(photos ?? []).flatMap((p) => {
            const url = urlByPath.get(p.storage_path);
            return url
              ? [{ id: p.id, url, path: p.storage_path, caption: p.caption, takenAt: p.taken_at }]
              : [];
          })}
        />
      </div>
      {photos?.length === 0 && (
        <p className="mt-6 text-stone-500">ยังไม่มีรูปในอัลบั้มนี้</p>
      )}
    </>
  );
}
