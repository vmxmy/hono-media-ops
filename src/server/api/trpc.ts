import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/db";
import { services } from "@/server/services";
import { auth } from "@/lib/auth";

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();

  return {
    db,
    services,
    session,
    user: session?.user as AuthUser | null,
    ...opts,
  };
};

// Extended context type for protected procedures
export type ProtectedContext = Awaited<ReturnType<typeof createTRPCContext>> & {
  user: AuthUser;
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedure (requires auth)
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "未授权" });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.session.user as AuthUser,
    },
  });
});
