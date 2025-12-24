import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { jwtVerify } from "jose";
import { db } from "@/server/db";
import { services } from "@/server/services";
import { env } from "@/env";

interface JWTPayload {
  userId: string;
  username: string;
}

export interface AuthUser {
  id: string;
  username: string;
}

export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    services,
    ...opts,
  };
};

// Extended context type for protected procedures
export type ProtectedContext = Awaited<ReturnType<typeof createTRPCContext>> & {
  token: string;
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
  const authHeader = ctx.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "未授权" });
  }

  const token = authHeader.slice(7);

  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const user = payload as unknown as JWTPayload;

    if (!user.userId || !user.username) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token payload" });
    }

    return next({
      ctx: {
        ...ctx,
        token,
        user: {
          id: user.userId,
          username: user.username,
        },
      },
    });
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token verification failed" });
  }
});
