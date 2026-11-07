import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@songdrop/db";
import { ExternalLink, Music } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CopyLinkButton } from "@/components/CopyLinkButton";

type Props = { params: Promise<{ id: string }> };

const PLATFORM_LABELS: Record<string, string> = {
  spotify: "Spotify",
  applemusic: "Apple Music",
  youtubemusic: "YouTube Music",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  tidal: "Tidal",
  deezer: "Deezer",
  amazonmusic: "Amazon Music",
  bandcamp: "Bandcamp",
};

function platformLabel(key: string) {
  const known = PLATFORM_LABELS[key.toLowerCase().replace(/[\s_-]/g, "")];
  if (known) return known;
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseLinks(raw: string): [string, string][] {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];
    return Object.entries(parsed).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && /^https?:\/\//.test(entry[1]),
    );
  } catch {
    return [];
  }
}

async function getSong(slug: string) {
  return prisma.song.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const song = await getSong(id);
  if (!song) return { title: "Song not found" };

  return {
    title: `${song.title} by ${song.artist}`,
    description: `Listen to ${song.title} by ${song.artist} on your favorite platform.`,
    openGraph: {
      title: `${song.title} by ${song.artist}`,
      images: song.thumbnailUrl ? [song.thumbnailUrl] : [],
    },
  };
}

export default async function Page({ params }: Props) {
  const { id } = await params;
  const song = await getSong(id);

  if (!song) notFound();

  const links = parseLinks(song.links);

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
      {/* Blurred cover art backdrop */}
      {song.thumbnailUrl && (
        <div aria-hidden className="absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={song.thumbnailUrl}
            alt=""
            className="size-full scale-125 object-cover opacity-30 blur-3xl"
          />
          <div className="absolute inset-0 bg-linear-to-b from-background/40 via-background/80 to-background" />
        </div>
      )}

      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-8 px-5 py-12">
        <header className="flex flex-col items-center gap-6 text-center">
          <div className="aspect-square w-full max-w-72 overflow-hidden rounded-xl border bg-muted shadow-xl">
            {song.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={song.thumbnailUrl}
                alt={`Cover art for ${song.title}`}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <Music className="size-16" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <h1 className="text-balance text-3xl font-bold tracking-tight">
              {song.title}
            </h1>
            <p className="text-lg text-muted-foreground">{song.artist}</p>
          </div>
        </header>

        <Card className="bg-card/80 backdrop-blur">
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Listen on</h2>
              <Badge variant="secondary">
                {links.length} {links.length === 1 ? "platform" : "platforms"}
              </Badge>
            </div>
            <Separator />

            {links.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {links.map(([platform, url]) => (
                  <li key={platform}>
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full justify-between flex"
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex gap-2 items-center"
                      >
                        <span className="font-medium">
                          {platformLabel(platform)}
                        </span>
                        <ExternalLink className="size-4 text-muted-foreground" />
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No streaming links have been added for this song yet.
              </p>
            )}
          </CardContent>
        </Card>

        <footer className="flex justify-center">
          <CopyLinkButton />
        </footer>
      </div>
    </main>
  );
}
