import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with custom authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()::text`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  freeVideoSelectionsUsed: integer("free_video_selections_used").default(0),
  freeHeadshotSelectionsUsed: integer("free_headshot_selections_used").default(0),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content items (videos and headshots)
export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // 'video' or 'headshot'
  category: varchar("category").notNull(), // 'free' or 'premium'
  filename: varchar("filename").notNull(),
  fileUrl: varchar("file_url").notNull(),
  duration: varchar("duration"), // for videos
  thumbnailUrl: varchar("thumbnail_url"),
  price: decimal("price", { precision: 10, scale: 2 }).default("25.00"), // Individual price for premium content
  createdAt: timestamp("created_at").defaultNow(),
});

// Payment records
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  contentItemId: integer("content_item_id").references(() => contentItems.id),
  stripePaymentIntentId: varchar("stripe_payment_intent_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("usd"),
  status: varchar("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Free selections tracking
export const freeSelections = pgTable("free_selections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  contentItemId: integer("content_item_id").references(() => contentItems.id).notNull(),
  selectedAt: timestamp("selected_at").defaultNow(),
});

// Download history
export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  contentItemId: integer("content_item_id").references(() => contentItems.id).notNull(),
  downloadedAt: timestamp("downloaded_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  contentItems: many(contentItems),
  payments: many(payments),
  downloads: many(downloads),
  freeSelections: many(freeSelections),
}));

export const contentItemsRelations = relations(contentItems, ({ one, many }) => ({
  user: one(users, {
    fields: [contentItems.userId],
    references: [users.id],
  }),
  downloads: many(downloads),
  payments: many(payments),
  freeSelections: many(freeSelections),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, {
    fields: [payments.userId],
    references: [users.id],
  }),
  contentItem: one(contentItems, {
    fields: [payments.contentItemId],
    references: [contentItems.id],
  }),
}));

export const downloadsRelations = relations(downloads, ({ one }) => ({
  user: one(users, {
    fields: [downloads.userId],
    references: [users.id],
  }),
  contentItem: one(contentItems, {
    fields: [downloads.contentItemId],
    references: [contentItems.id],
  }),
}));

export const freeSelectionsRelations = relations(freeSelections, ({ one }) => ({
  user: one(users, {
    fields: [freeSelections.userId],
    references: [users.id],
  }),
  contentItem: one(contentItems, {
    fields: [freeSelections.contentItemId],
    references: [contentItems.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments);
export const insertDownloadSchema = createInsertSchema(downloads);
export const insertFreeSelectionSchema = createInsertSchema(freeSelections);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type Download = typeof downloads.$inferSelect;
export type InsertDownload = typeof downloads.$inferInsert;
export type FreeSelection = typeof freeSelections.$inferSelect;
export type InsertFreeSelection = typeof freeSelections.$inferInsert;
