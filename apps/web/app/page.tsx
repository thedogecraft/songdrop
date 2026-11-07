"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Page() {
  const [url, setUrl] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLink(null);
    setCopied(false);
    setLoading(true);

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      setLink(`${window.location.origin}/s/${data.slug}`);
      setUrl("");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-24">
      <h1 className="text-4xl font-bold">
        Share Music On all platforms with ghostshare
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 flex w-full max-w-md gap-2">
        <Input
          placeholder="Enter a Spotify or Apple Music Link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !url.trim()}>
          {loading ? "Creating…" : "Create link"}
        </Button>
      </form>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {link && (
        <div className="mt-6 flex w-full max-w-md items-center gap-2 rounded-2xl bg-input/50 p-2">
          <a
            href={link}
            className="min-w-0 flex-1 truncate px-2 text-sm underline-offset-4 hover:underline"
          >
            {link}
          </a>
          <Button type="button" variant="secondary" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default Page;
