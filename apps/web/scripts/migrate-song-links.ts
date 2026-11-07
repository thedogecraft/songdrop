import { migrateSongLinks } from "../lib/music/migrate";

const args = process.argv.slice(2);

function flag(name: string) {
  const arg = args.find(
    (value) => value === `--${name}` || value.startsWith(`--${name}=`),
  );
  if (!arg) return undefined;
  const eq = arg.indexOf("=");
  return eq === -1 ? "" : arg.slice(eq + 1);
}

function usage() {
  console.log(`Usage: bun run migrate:links [options]

Adds provider links that are missing from existing songs by re-resolving each
song from one of its stored links. Dry run unless --write is passed.

Options:
  --write            Persist changes (default: read-only)
  --provider <key>   Only add one provider supported by resolve.ts (e.g. deezer)
  --slug <slug>      Only migrate one song
  --limit <n>        Inspect at most n songs
  --help             Show this message

Examples:
  bun run migrate:links
  bun run migrate:links --provider=deezer
  bun run migrate:links --provider=deezer --limit=10
  bun run migrate:links --provider=deezer --write
`);
}

async function main() {
  if (args.includes("--help") || args.includes("-h")) {
    usage();
    return;
  }

  const apply = args.includes("--write");
  const provider = flag("provider") || undefined;
  const slug = flag("slug") || undefined;
  const rawLimit = flag("limit");
  const limit = rawLimit ? Number.parseInt(rawLimit, 10) : undefined;

  if (rawLimit && (!Number.isFinite(limit) || (limit ?? 0) < 1)) {
    throw new Error(`Invalid --limit value: ${rawLimit}`);
  }

  console.log(
    apply
      ? "Mode: WRITE (changes will be saved)"
      : "Mode: dry run (pass --write to save changes)",
  );
  console.log(
    [
      provider && `provider=${provider}`,
      slug && `slug=${slug}`,
      limit && `limit=${limit}`,
    ]
      .filter(Boolean)
      .join(" ") || "all songs",
  );

  const summary = await migrateSongLinks({
    apply,
    provider,
    slug,
    limit,
    onSong: (message) => console.log(message),
  });

  console.log("\nSummary");
  console.log(`  scanned:   ${summary.scanned}`);
  console.log(`  updated:   ${summary.updated}${apply ? "" : " (would be)"}`);
  console.log(`  unchanged: ${summary.unchanged}`);
  console.log(`  skipped:   ${summary.skipped}`);
  for (const [key, count] of Object.entries(summary.added)) {
    console.log(`  added ${key}: ${count}`);
  }

  if (!apply && summary.updated > 0) {
    console.log("\nRe-run with --write to apply these changes.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
