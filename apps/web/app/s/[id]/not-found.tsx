import Link from "next/link";
import { Music } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 bg-background px-5 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Music className="size-6" />
      </div>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Song not found</h1>
        <p className="text-muted-foreground">
          This link may be mistyped or the song was removed.
        </p>
      </div>
      <Button variant="secondary" size="sm">
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
