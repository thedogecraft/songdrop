const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

function parseAppleUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.hostname !== "music.apple.com") return null;
  const parts = u.pathname.split("/").filter(Boolean);
  const storefront = parts[0] ?? "us";
  const id =
    u.searchParams.get("i") ?? (parts[1] === "song" ? parts.at(-1)! : null);
  return id && /^\d+$/.test(id) ? { id, storefront } : null;
}

export async function resolveTrack(url: string) {
  const parsed = parseAppleUrl(url);
  if (!parsed) return null;

  // 1. Apple lookup
  const apple = await fetch(
    `https://itunes.apple.com/lookup?id=${parsed.id}&country=${parsed.storefront}&entity=song`,
  ).then((r) => r.json());
  const song = apple.results?.find((x: any) => x.wrapperType === "track");
  if (!song) return null;

  const links: Record<string, string> = { appleMusic: song.trackViewUrl };
  let isrc: string | undefined;

  // 2. Deezer match (plain query, verify title + duration)
  const q = encodeURIComponent(`${song.trackName} ${song.artistName}`);
  const deezer = await fetch(
    `https://api.deezer.com/search?q=${q}&limit=10`,
  ).then((r) => r.json());
  const match = (deezer.data ?? []).find(
    (d: any) =>
      norm(d.title) === norm(song.trackName) &&
      Math.abs(d.duration * 1000 - song.trackTimeMillis) <= 3000,
  );
  if (match) {
    links.deezer = match.link;
    // The full track object has the ISRC; useful for deduping later
    const full = await fetch(`https://api.deezer.com/track/${match.id}`).then(
      (r) => r.json(),
    );
    isrc = full?.isrc;
  }

  return {
    title: song.trackName as string,
    artist: song.artistName as string,
    artworkUrl: (song.artworkUrl100 as string | undefined)?.replace(
      "100x100bb",
      "600x600bb",
    ),
    links,
    dedupeKey: isrc ?? `${norm(song.trackName)}|${norm(song.artistName)}`,
  };
}
