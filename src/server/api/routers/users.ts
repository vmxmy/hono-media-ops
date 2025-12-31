import { z } from "zod"
import { eq } from "drizzle-orm"
import { TRPCError } from "@trpc/server"
import { createTRPCRouter, protectedProcedure } from "../trpc"
import { users } from "@/server/db/schema"
import { hashPassword, isHashedPassword, verifyPassword } from "@/lib/password"

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(50),
})

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export const usersRouter = createTRPCRouter({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const [user] = await ctx.db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        image: users.image,
      })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1)

    return user ?? null
  }),

  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(users)
        .set({ name: input.name })
        .where(eq(users.id, ctx.user.id))
      return { success: true }
    }),

  updatePassword: protectedProcedure
    .input(updatePasswordSchema)
    .mutation(async ({ ctx, input }) => {
      const [user] = await ctx.db
        .select({ id: users.id, accessCode: users.accessCode })
        .from(users)
        .where(eq(users.id, ctx.user.id))
        .limit(1)

      if (!user?.accessCode) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "当前账号未设置密码" })
      }

      const isValid = await verifyPassword(input.currentPassword, user.accessCode)
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "当前密码不正确" })
      }

      const hashed = await hashPassword(input.newPassword)
      await ctx.db
        .update(users)
        .set({ accessCode: hashed })
        .where(eq(users.id, ctx.user.id))

      return { success: true, upgraded: !isHashedPassword(user.accessCode) }
    }),
})
