import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@songdrop/db";
import { resolveTrack } from "@/lib/music/resolve";

export async function POST(req: Request) {
  const { url } = await req.json();
  if (typeof url !== "string") {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const r = await resolveTrack(url);
  if (!r) {
    return NextResponse.json(
      { error: "Could not resolve that link" },
      { status: 422 },
    );
  }

  const song = await prisma.song.upsert({
    where: { dedupeKey: r.dedupeKey },
    update: {},
    create: {
      slug: nanoid(8),
      dedupeKey: r.dedupeKey,
      title: r.title,
      artist: r.artist,
      thumbnailUrl: r.artworkUrl ?? null,
      links: JSON.stringify(r.links),
    },
  });

  return NextResponse.json({ slug: song.slug });
}
