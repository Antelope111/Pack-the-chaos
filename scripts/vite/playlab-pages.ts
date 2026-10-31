import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";

// Keep the original, dependency-free games editable under public/. The route
// handlers use the same HTML in development and in the hosted Worker.
export function playlabPages(): Plugin {
  const id = "\0playlab-pages";
  return {
    name: "playlab-pages",
    resolveId(source) { if (source === "virtual:playlab-pages") return id; },
    async load(source) {
      if (source !== id) return;
      const pages: Record<string, string> = {};
      for (const game of ["home", "packing", "pong", "path", "knife"]) {
        const file = resolve("public", game === "home" ? "index.html" : `games/${game}/index.html`);
        this.addWatchFile(file);
        pages[game] = await readFile(file, "utf8");
      }
      return `export default ${JSON.stringify(pages)};`;
    },
  };
}
