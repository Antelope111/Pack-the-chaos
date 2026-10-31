import { env } from "cloudflare:workers";
import { handleCommunityRequest } from "@/lib/community-server";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return handleCommunityRequest(request, env.DB);
}

export function POST(request: Request) {
  return handleCommunityRequest(request, env.DB);
}
