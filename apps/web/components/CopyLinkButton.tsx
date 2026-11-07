"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard unavailable (e.g. insecure context); fail silently.
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={copy} aria-live="polite">
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      {copied ? "Link copied" : "Copy link"}
    </Button>
  );
}
