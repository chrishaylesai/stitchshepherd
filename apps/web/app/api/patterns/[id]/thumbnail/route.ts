import { TRPCError } from "@trpc/server";

import { loadPatternThumbnail } from "@stitchharbor/api";

import { auth } from "@/lib/auth";

export const runtime = "nodejs";

type ThumbnailRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: ThumbnailRouteContext) {
  const { id } = await params;

  try {
    const thumbnail = await loadPatternThumbnail({
      id,
      session: await auth()
    });
    const body = new Uint8Array(thumbnail.body);

    return new Response(body.buffer, {
      headers: {
        "Cache-Control": thumbnail.isPublic
          ? "public, max-age=3600, stale-while-revalidate=86400"
          : "private, max-age=60",
        "Content-Type": "image/png",
        "Last-Modified": thumbnail.updatedAt.toUTCString()
      }
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      return new Response(error.message, { status: getStatusCode(error.code) });
    }

    return new Response("Failed to load pattern thumbnail.", { status: 500 });
  }
}

function getStatusCode(code: TRPCError["code"]) {
  switch (code) {
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    default:
      return 500;
  }
}
