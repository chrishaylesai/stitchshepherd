import { initTRPC } from "@trpc/server";
import superjson from "superjson";

export type ApiContext = {
  session: unknown;
};

const t = initTRPC.context<ApiContext>().create({
  transformer: superjson
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true }))
});

export type AppRouter = typeof appRouter;
