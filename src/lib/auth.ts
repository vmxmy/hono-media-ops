import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import Credentials from "next-auth/providers/credentials"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/server/db"
import { eq, and, isNull } from "drizzle-orm"
import { hashPassword, isHashedPassword, verifyPassword } from "@/lib/password"
import {
  users,
  accounts,
  sessions,
  verificationTokens,
} from "@/server/db/schema"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: "jwt",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        accessCode: { label: "Access Code", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.accessCode) {
          return null
        }

        const username = credentials.username as string
        const accessCode = credentials.accessCode as string

        const [user] = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.username, username),
              isNull(users.deletedAt)
            )
          )
          .limit(1)

        if (!user) {
          return null
        }

        if (!user.accessCode) {
          return null
        }

        const isValid = await verifyPassword(accessCode, user.accessCode)
        if (!isValid) {
          return null
        }

        if (!isHashedPassword(user.accessCode)) {
          const hashed = await hashPassword(accessCode)
          await db.update(users).set({ accessCode: hashed }).where(eq(users.id, user.id))
        }

        return {
          id: user.id,
          name: user.name ?? user.username,
          email: user.email,
          image: user.image,
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id
      }
      return token
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
      },
    }),
  },
})
