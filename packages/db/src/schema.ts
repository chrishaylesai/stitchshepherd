import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid
} from "drizzle-orm/pg-core";

import type { FrameConfig, PatternContent } from "@stitchharbor/types";

export const contentStorageEnum = pgEnum("content_storage", ["inline", "s3"]);
export const frameTypeEnum = pgEnum("frame_type", ["none", "circle", "oval", "rectangle"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date", withTimezone: true }),
  image: text("image"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow()
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state")
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] })
  })
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull()
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] })
  })
);

export const patterns = pgTable(
  "patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled Pattern"),
    description: text("description"),
    isPublic: boolean("is_public").notNull().default(true),
    gridWidth: integer("grid_width").notNull(),
    gridHeight: integer("grid_height").notNull(),
    fabricCount: integer("fabric_count").notNull(),
    frameType: frameTypeEnum("frame_type").notNull().default("none"),
    frameParams: jsonb("frame_params").$type<FrameConfig>().notNull().default(sql`'{"type":"none"}'::jsonb`),
    contentStorage: contentStorageEnum("content_storage").notNull().default("inline"),
    contentS3Key: text("content_s3_key"),
    content: jsonb("content").$type<PatternContent>(),
    stitchCount: integer("stitch_count").notNull().default(0),
    colorCount: integer("color_count").notNull().default(0),
    thumbnailUrl: text("thumbnail_url"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    publicIdx: index("idx_patterns_public").on(table.isPublic, table.updatedAt.desc()),
    userIdx: index("idx_patterns_user").on(table.userId, table.updatedAt.desc())
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  patterns: many(patterns)
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  })
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id]
  })
}));

export const patternsRelations = relations(patterns, ({ one }) => ({
  user: one(users, {
    fields: [patterns.userId],
    references: [users.id]
  })
}));
