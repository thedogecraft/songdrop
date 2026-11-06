const url = process.argv[2];
if (!url) throw new Error("Usage: npx tsx match.ts <apple music song url>");

// Get the song ID: album links use ?i=, song links end with the ID
const u = new URL(url);
const storefront = u.pathname.split("/").filter(Boolean)[0] ?? "us";
const id =
  u.searchParams.get("i") ?? u.pathname.split("/").filter(Boolean).at(-1);

async function main() {
  // 1. Look up the song on Apple (iTunes API)
  const apple = await fetch(
    `https://itunes.apple.com/lookup?id=${id}&country=${storefront}&entity=song`,
  ).then((r) => r.json());
  const song = apple.results.find((x: any) => x.wrapperType === "track");
  console.log(
    "Apple:",
    song.trackName,
    "-",
    song.artistName,
    `(${song.trackTimeMillis} ms)`,
  );

  // 2. Search Deezer with a plain query, then verify title + duration
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();

  const deezer = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(`${song.trackName} ${song.artistName}`)}&limit=10`,
  ).then((r) => r.json());

  const match = (deezer.data ?? []).find(
    (d: any) =>
      norm(d.title) === norm(song.trackName) &&
      Math.abs(d.duration * 1000 - song.trackTimeMillis) <= 3000,
  );
  console.log("Deezer:", match ? match.link : "no match");
}

main();
