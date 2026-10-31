import pages from "virtual:playlab-pages";

export function GET() {
  return new Response(pages.home, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } });
}
