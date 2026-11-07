const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

type Track = {
  title: string;
  artist: string;
  artworkUrl?: string;
  durationMs: number;
  isrc?: string;
};

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

function parseSpotifyUrl(raw: string) {
  const uri = raw.match(/^spotify:track:([A-Za-z0-9]+)$/);
  if (uri) return { id: uri[1] };

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.hostname !== "open.spotify.com") return null;
  const match = u.pathname.match(/\/track\/([A-Za-z0-9]+)/);
  return match ? { id: match[1] } : null;
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getSpotifyToken() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;

  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.token;
  }

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.token;
}

async function getSpotifyTrack(id: string) {
  const token = await getSpotifyToken();
  if (!token) return null;

  const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const track = await res.json();
  const images: { url: string; width: number }[] = track.album?.images ?? [];
  const artworkUrl = images.sort((a, b) => b.width - a.width)[0]?.url;

  return {
    title: track.name as string,
    artist: (track.artists ?? []).map((a: any) => a.name).join(", "),
    artworkUrl,
    durationMs: track.duration_ms as number,
    isrc: track.external_ids?.isrc as string | undefined,
    link: track.external_urls?.spotify as string | undefined,
  };
}

async function findAppleTrack(track: Track) {
  const q = encodeURIComponent(`${track.title} ${track.artist}`);
  const res = await fetch(
    `https://itunes.apple.com/search?term=${q}&entity=song&limit=10&country=us`,
  ).then((r) => r.json());

  return (res.results ?? []).find(
    (x: any) =>
      x.kind === "song" &&
      norm(x.trackName) === norm(track.title) &&
      Math.abs(x.trackTimeMillis - track.durationMs) <= 3000,
  );
}

async function findDeezerTrack(track: Track) {
  if (track.isrc) {
    const byIsrc = await fetch(
      `https://api.deezer.com/track/isrc:${track.isrc}`,
    ).then((r) => r.json());
    if (byIsrc && !byIsrc.error && byIsrc.link) return byIsrc;
  }

  const q = encodeURIComponent(`${track.title} ${track.artist}`);
  const res = await fetch(
    `https://api.deezer.com/search?q=${q}&limit=10`,
  ).then((r) => r.json());

  return (res.data ?? []).find(
    (d: any) =>
      norm(d.title) === norm(track.title) &&
      Math.abs(d.duration * 1000 - track.durationMs) <= 3000,
  );
}

async function findSpotifyTrack(track: Track) {
  const token = await getSpotifyToken();
  if (!token) return null;

  const queries = [];
  if (track.isrc) queries.push(`isrc:${track.isrc}`);
  queries.push(`track:${track.title} artist:${track.artist}`);

  for (const q of queries) {
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) continue;

    const data = await res.json();
    const match = (data.tracks?.items ?? []).find(
      (t: any) => norm(t.name) === norm(track.title),
    );
    if (match) return match;
  }

  return null;
}

async function resolveFromApple(parsed: { id: string; storefront: string }) {
  const apple = await fetch(
    `https://itunes.apple.com/lookup?id=${parsed.id}&country=${parsed.storefront}&entity=song`,
  ).then((r) => r.json());
  const song = apple.results?.find((x: any) => x.wrapperType === "track");
  if (!song) return null;

  const track: Track = {
    title: song.trackName,
    artist: song.artistName,
    artworkUrl: (song.artworkUrl100 as string | undefined)?.replace(
      "100x100bb",
      "600x600bb",
    ),
    durationMs: song.trackTimeMillis,
  };

  const links: Record<string, string> = { appleMusic: song.trackViewUrl };

  const deezer = await findDeezerTrack(track);
  if (deezer) {
    links.deezer = deezer.link;
    track.isrc = deezer.isrc;
  }

  const spotify = await findSpotifyTrack(track);
  if (spotify?.external_urls?.spotify) {
    links.spotify = spotify.external_urls.spotify;
    track.isrc = track.isrc ?? spotify.external_ids?.isrc;
  }

  return {
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
    links,
    dedupeKey: track.isrc ?? `${norm(track.title)}|${norm(track.artist)}`,
  };
}

async function resolveFromSpotify(id: string) {
  const spotify = await getSpotifyTrack(id);
  if (!spotify) return null;

  const track: Track = {
    title: spotify.title,
    artist: spotify.artist,
    artworkUrl: spotify.artworkUrl,
    durationMs: spotify.durationMs,
    isrc: spotify.isrc,
  };

  const links: Record<string, string> = {};
  if (spotify.link) links.spotify = spotify.link;

  const apple = await findAppleTrack(track);
  if (apple?.trackViewUrl) {
    links.appleMusic = apple.trackViewUrl;
  }

  const deezer = await findDeezerTrack(track);
  if (deezer?.link) {
    links.deezer = deezer.link;
    track.isrc = track.isrc ?? deezer.isrc;
  }

  return {
    title: track.title,
    artist: track.artist,
    artworkUrl: track.artworkUrl,
    links,
    dedupeKey: track.isrc ?? `${norm(track.title)}|${norm(track.artist)}`,
  };
}

export async function resolveTrack(url: string) {
  const spotify = parseSpotifyUrl(url);
  if (spotify) return resolveFromSpotify(spotify.id);

  const apple = parseAppleUrl(url);
  if (apple) return resolveFromApple(apple);

  return null;
}
