import Link from "next/link";
import { Music } from "lucide-react";
import { prisma } from "@ghostshare/db";
import { Suspense } from "react";

import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "All songs",
  description: "Browse all songs shared on Songdrop.",
};

export default function Page() {
  return (
    <main className="mx-auto min-h-svh w-full max-w-5xl px-5 py-12">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">All songs</h1>
        <p className="text-muted-foreground">
          Browse songs shared on Songdrop.
        </p>
      </header>

      <Suspense
        fallback={
          <p
            role="status"
            className="rounded-lg border border-dashed p-8 text-center text-muted-foreground"
          >
            Loading songs...
          </p>
        }
      >
        <SongList />
      </Suspense>
    </main>
  );
}

async function SongList() {
  const songs = await prisma.song.findMany();

  return (
    <>
      {songs.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {songs.map((song) => {
            const songId = song.slug || song.dedupeKey;

            return (
              <li key={song.id}>
                <Link
                  href={`/s/${encodeURIComponent(songId)}`}
                  className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Card className="h-full transition-colors group-hover:border-primary">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="size-16 shrink-0 overflow-hidden rounded-md bg-muted">
                        {song.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={song.thumbnailUrl}
                            alt={`Cover art for ${song.title}`}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-muted-foreground">
                            <Music className="size-7" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate font-semibold group-hover:underline">
                          {song.title}
                        </h2>
                        <p className="truncate text-sm text-muted-foreground">
                          {song.artist}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No songs have been added yet.
        </p>
      )}
    </>
  );
}
