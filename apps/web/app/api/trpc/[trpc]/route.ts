import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { appRouter, type ApiContext } from "@stitchharbor/api";

import { auth } from "@/lib/auth";

export const runtime = "nodejs";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async (): Promise<ApiContext> => ({
      session: await auth()
    })
  });
}

export { handler as GET, handler as POST };
