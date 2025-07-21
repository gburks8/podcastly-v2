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

// Projects table for custom project names and organization
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar("name").notNull(),
  // Project-based pricing configuration
  freeVideoLimit: integer("free_video_limit").default(3),
  additional3VideosPrice: decimal("additional_3_videos_price", { precision: 10, scale: 2 }).default("199.00"),
  allContentPrice: decimal("all_content_price", { precision: 10, scale: 2 }).default("499.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
  hasAdditional3Videos: boolean("has_additional_3_videos").default(false),
  hasAllRemainingContent: boolean("has_all_remaining_content").default(false),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Content items (videos and headshots)
export const contentItems = pgTable("content_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'cascade' }),
  title: varchar("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // 'video' or 'headshot'
  category: varchar("category").notNull(), // 'free' or 'premium'
  filename: varchar("filename").notNull(),
  fileUrl: varchar("file_url").notNull(),
  duration: varchar("duration"), // for videos
  thumbnailUrl: varchar("thumbnail_url"),
  width: integer("width"), // Video/image width in pixels
  height: integer("height"), // Video/image height in pixels
  aspectRatio: decimal("aspect_ratio", { precision: 5, scale: 3 }), // width/height ratio
  price: decimal("price", { precision: 10, scale: 2 }).default("25.00"), // Individual price for premium content
  createdAt: timestamp("created_at").defaultNow(),
});

// Project-based payment records
export const projectPayments = pgTable("project_payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  packageType: varchar("package_type").notNull(), // 'additional_3_videos' or 'all_content'
  stripePaymentIntentId: varchar("stripe_payment_intent_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency").default("usd"),
  status: varchar("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Project-based free selections tracking
export const projectSelections = pgTable("project_selections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  contentItemId: integer("content_item_id").references(() => contentItems.id).notNull(),
  selectionType: varchar("selection_type").notNull(), // 'free', 'additional_3', or 'all_content'
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
  downloads: many(downloads),
  projects: many(projects),
  projectSelections: many(projectSelections),
  projectPayments: many(projectPayments),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  contentItems: many(contentItems),
  selections: many(projectSelections),
  payments: many(projectPayments),
}));

export const contentItemsRelations = relations(contentItems, ({ one, many }) => ({
  user: one(users, {
    fields: [contentItems.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [contentItems.projectId],
    references: [projects.id],
  }),
  downloads: many(downloads),
  projectSelections: many(projectSelections),
}));

export const projectPaymentsRelations = relations(projectPayments, ({ one }) => ({
  user: one(users, {
    fields: [projectPayments.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [projectPayments.projectId],
    references: [projects.id],
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

export const projectSelectionsRelations = relations(projectSelections, ({ one }) => ({
  user: one(users, {
    fields: [projectSelections.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [projectSelections.projectId],
    references: [projects.id],
  }),
  contentItem: one(contentItems, {
    fields: [projectSelections.contentItemId],
    references: [contentItems.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const insertContentItemSchema = createInsertSchema(contentItems).omit({ id: true, createdAt: true });
export const insertDownloadSchema = createInsertSchema(downloads);
export const insertProjectSchema = createInsertSchema(projects).omit({ createdAt: true, updatedAt: true });
export const insertProjectSelectionSchema = createInsertSchema(projectSelections);
export const insertProjectPaymentSchema = createInsertSchema(projectPayments);

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type ContentItem = typeof contentItems.$inferSelect;
export type InsertContentItem = typeof contentItems.$inferInsert;
export type Download = typeof downloads.$inferSelect;
export type InsertDownload = typeof downloads.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type ProjectSelection = typeof projectSelections.$inferSelect;
export type InsertProjectSelection = typeof projectSelections.$inferInsert;
export type ProjectPayment = typeof projectPayments.$inferSelect;
export type InsertProjectPayment = typeof projectPayments.$inferInsert;
