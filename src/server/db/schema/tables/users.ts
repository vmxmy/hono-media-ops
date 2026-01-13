/**
 * Users & Auth Tables
 * NextAuth.js compatible tables for authentication
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { storageProviderEnum } from "../enums";

// ==================== Users Table ====================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    // Legacy fields (kept for backwards compatibility)
    username: text("username"),
    accessCode: text("access_code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    usernameIdx: uniqueIndex("idx_users_username").on(table.username),
    emailIdx: uniqueIndex("idx_users_email").on(table.email),
  })
);

// ==================== NextAuth Accounts Table ====================

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
    index("idx_accounts_user_id").on(account.userId),
  ]
);

// ==================== NextAuth Sessions Table ====================

export const sessions = pgTable(
  "sessions",
  {
    sessionToken: text("session_token").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (session) => [
    index("idx_sessions_user_id").on(session.userId),
  ]
);

// ==================== NextAuth Verification Tokens Table ====================

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [
    primaryKey({ columns: [vt.identifier, vt.token] }),
  ]
);

// ==================== User Storage Configs Table ====================

export const userStorageConfigs = pgTable(
  "user_storage_configs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),

    // Provider type
    provider: storageProviderEnum("provider").default("local").notNull(),
    isActive: integer("is_active").default(0).notNull(), // 0=inactive, 1=active

    // Common S3-compatible fields
    bucket: text("bucket"),
    accessKeyId: text("access_key_id"),
    secretAccessKey: text("secret_access_key"), // Should be encrypted in production
    publicDomain: text("public_domain"),

    // R2 specific
    r2AccountId: text("r2_account_id"),

    // S3 specific
    s3Region: text("s3_region").default("us-east-1"),
    s3Endpoint: text("s3_endpoint"),

    // Metadata
    name: text("name"), // User-friendly name like "My R2 Storage"

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: uniqueIndex("idx_user_storage_configs_user_id").on(table.userId),
  })
);

// ==================== Type Exports ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type UserStorageConfig = typeof userStorageConfigs.$inferSelect;
export type NewUserStorageConfig = typeof userStorageConfigs.$inferInsert;
