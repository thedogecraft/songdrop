"use client";

import { useEffect } from "react";

export function ThemeOverride({ color }: { color?: string }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.getPropertyValue("--primary");
    const previousPriority = root.style.getPropertyPriority("--primary");

    if (color) {
      root.style.setProperty("--primary", color);
    }

    return () => {
      if (previous) {
        root.style.setProperty("--primary", previous, previousPriority);
      } else {
        root.style.removeProperty("--primary");
      }
    };
  }, [color]);

  return null;
}
