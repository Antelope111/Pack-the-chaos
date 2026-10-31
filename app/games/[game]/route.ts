import pages from "virtual:playlab-pages";

export function GET(request: Request) {
  const game = new URL(request.url).pathname.split("/")[2];
  if (!["packing", "pong", "path", "knife"].includes(game)) return new Response("Game not found", { status: 404 });
  return new Response(pages[game], { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } });
}
