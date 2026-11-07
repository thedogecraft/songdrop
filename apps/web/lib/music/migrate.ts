import { prisma } from "@ghostshare/db";
import { resolveTrack } from "./resolve";

type StoredLinks = Record<string, string>;

export type MigrateOptions = {
  /** Persist changes. When false the database is only read. */
  apply?: boolean;
  /** Maximum number of songs to inspect. */
  limit?: number;
  /** Only inspect a single song by slug. */
  slug?: string;
  /** Only add a single provider key, e.g. "deezer" or "appleMusic". */
  provider?: string;
  /** Called for every song that changed or was skipped. */
  onSong?: (message: string) => void;
};

export type MigrateSummary = {
  scanned: number;
  updated: number;
  unchanged: number;
  skipped: number;
  added: Record<string, number>;
};

function parseLinks(raw: string): StoredLinks {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === "string" && /^https?:\/\//.test(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

async function resolveFromStoredLinks(links: StoredLinks) {
  for (const url of Object.values(links)) {
    const resolved = await resolveTrack(url);
    if (resolved) return resolved;
  }
  return null;
}

/**
 * Re-resolves existing songs from one of their stored provider links and adds
 * provider links that were missing when the song was created. Existing links
 * are never overwritten.
 *
 * This is intentionally manual: it is not wired into startup, migrations, or
 * any request path.
 */
export async function migrateSongLinks(
  options: MigrateOptions = {},
): Promise<MigrateSummary> {
  const { apply = false, provider, slug, onSong } = options;

  const songs = await prisma.song.findMany({
    where: slug ? { slug } : undefined,
    orderBy: { createdAt: "asc" },
  });

  const targets = songs
    .map((song) => ({ song, links: parseLinks(song.links) }))
    .filter(({ links }) => !provider || !(provider in links))
    .slice(0, options.limit ?? songs.length);

  const summary: MigrateSummary = {
    scanned: targets.length,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    added: {},
  };

  for (const { song, links } of targets) {
    const resolved = await resolveFromStoredLinks(links);

    if (!resolved) {
      summary.skipped++;
      onSong?.(`skip  ${song.slug}  ${song.title} (no resolvable link)`);
      continue;
    }

    const additions = Object.fromEntries(
      Object.entries(resolved.links).filter(
        ([key]) =>
          !(key in links) && (provider === undefined || key === provider),
      ),
    );

    const thumbnailUrl = song.thumbnailUrl ?? resolved.artworkUrl ?? null;
    const thumbnailChanged = thumbnailUrl !== song.thumbnailUrl;
    const addedKeys = Object.keys(additions);

    if (addedKeys.length === 0 && !thumbnailChanged) {
      summary.unchanged++;
      continue;
    }

    if (apply) {
      await prisma.song.update({
        where: { id: song.id },
        data: {
          links: JSON.stringify({ ...additions, ...links }),
          ...(thumbnailChanged ? { thumbnailUrl } : {}),
        },
      });
    }

    summary.updated++;
    for (const key of addedKeys) {
      summary.added[key] = (summary.added[key] ?? 0) + 1;
    }

    const detail =
      addedKeys.length > 0 ? `+${addedKeys.join(", ")}` : "artwork";
    onSong?.(
      `${apply ? "update" : "would "}${song.slug}  ${song.title}  ${detail}`,
    );
  }

  return summary;
}
