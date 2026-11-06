const url = process.argv[2];
if (!url) throw new Error("Usage: bun spotify.ts <spotify track url>");

const id = new URL(url).pathname.match(/\/track\/([A-Za-z0-9]+)/)?.[1];
if (!id) throw new Error("Couldn't find a track ID in that URL");

async function main() {
  // 1. Get a token
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64");

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  console.log("Token status:", tokenRes.status);
  if (!tokenRes.ok) {
    console.log(await tokenRes.text());
    return;
  }
  const { access_token } = await tokenRes.json();

  // 2. Fetch the track
  const trackRes = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  console.log("Track status:", trackRes.status);
  if (!trackRes.ok) {
    console.log(await trackRes.text());
    return;
  }
  const t = await trackRes.json();
  console.log("Title:", t.name);
  console.log("Artist:", t.artists.map((a: any) => a.name).join(", "));
  console.log("Duration:", t.duration_ms, "ms");
  console.log("ISRC:", t.external_ids?.isrc ?? "(missing)");
}

main();
