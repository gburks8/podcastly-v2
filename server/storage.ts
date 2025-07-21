import {
  users,
  contentItems,
  payments,
  downloads,
  freeSelections,
  type User,
  type UpsertUser,
  type ContentItem,
  type InsertContentItem,
  type Payment,
  type InsertPayment,
  type Download,
  type InsertDownload,
  type FreeSelection,
  type InsertFreeSelection,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, count } from "drizzle-orm";

export interface IStorage {
  // User operations (custom auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  updateUserStripeCustomerId(userId: string, customerId: string): Promise<void>;

  // Content operations
  getContentItems(userId: string): Promise<ContentItem[]>;
  getContentItem(id: number): Promise<ContentItem | undefined>;
  getContentItemsByUser(userId: string): Promise<ContentItem[]>;
  createContentItem(contentItem: InsertContentItem): Promise<ContentItem>;
  deleteContentItem(id: number): Promise<void>;

  // Free selection operations
  selectFreeContent(userId: string, contentItemId: number): Promise<void>;
  getFreeSelections(userId: string): Promise<FreeSelection[]>;
  canSelectFreeContent(userId: string, contentType: string): Promise<boolean>;

  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByStripeId(stripePaymentIntentId: string): Promise<Payment | undefined>;
  updatePaymentStatus(stripePaymentIntentId: string, status: string): Promise<void>;
  hasPurchasedContent(userId: string, contentItemId: number): Promise<boolean>;
  
  // Package purchase operations
  updateUserPackagePurchase(userId: string, packageType: string): Promise<void>;
  hasPackageAccess(userId: string, packageType: string): Promise<boolean>;

  // Download operations
  createDownload(download: InsertDownload): Promise<Download>;
  getDownloadHistory(userId: string): Promise<(Download & { contentItem: ContentItem })[]>;
  hasDownloadAccess(userId: string, contentItemId: number): Promise<boolean>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAllContentItems(): Promise<ContentItem[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
    await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Content operations
  async getContentItems(userId: string): Promise<ContentItem[]> {
    return await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.userId, userId))
      .orderBy(desc(contentItems.createdAt));
  }

  async getContentItem(id: number): Promise<ContentItem | undefined> {
    const [item] = await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.id, id));
    return item;
  }

  async getContentItemsByUser(userId: string): Promise<ContentItem[]> {
    return await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.userId, userId))
      .orderBy(desc(contentItems.createdAt));
  }

  async createContentItem(contentItem: InsertContentItem): Promise<ContentItem> {
    const [item] = await db
      .insert(contentItems)
      .values(contentItem)
      .returning();
    return item;
  }

  async deleteContentItem(id: number): Promise<void> {
    await db.delete(contentItems).where(eq(contentItems.id, id));
  }

  // Free selection operations
  async selectFreeContent(userId: string, contentItemId: number): Promise<void> {
    const contentItem = await this.getContentItem(contentItemId);
    if (!contentItem) throw new Error("Content not found");

    // Check if user can select more free content of this type
    const canSelect = await this.canSelectFreeContent(userId, contentItem.type);
    if (!canSelect) throw new Error("Free selections limit reached for this content type");

    // Create free selection record
    await db.insert(freeSelections).values({
      userId,
      contentItemId,
    });

    // Update user's free selection count
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const updateData: any = { updatedAt: new Date() };
    if (contentItem.type === "video") {
      updateData.freeVideoSelectionsUsed = (user.freeVideoSelectionsUsed || 0) + 1;
    } else if (contentItem.type === "headshot") {
      updateData.freeHeadshotSelectionsUsed = (user.freeHeadshotSelectionsUsed || 0) + 1;
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));
  }

  async getFreeSelections(userId: string): Promise<FreeSelection[]> {
    return await db
      .select()
      .from(freeSelections)
      .where(eq(freeSelections.userId, userId))
      .orderBy(desc(freeSelections.selectedAt));
  }

  async canSelectFreeContent(userId: string, contentType: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    if (contentType === "video") {
      return (user.freeVideoSelectionsUsed || 0) < 3;
    } else if (contentType === "headshot") {
      // No free headshots available in the current pricing model
      return false;
    }
    
    return false;
  }

  // Payment operations
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [paymentRecord] = await db
      .insert(payments)
      .values(payment)
      .returning();
    return paymentRecord;
  }

  async getPaymentByStripeId(stripePaymentIntentId: string): Promise<Payment | undefined> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId));
    return payment;
  }

  async updatePaymentStatus(stripePaymentIntentId: string, status: string): Promise<void> {
    await db
      .update(payments)
      .set({ status })
      .where(eq(payments.stripePaymentIntentId, stripePaymentIntentId));
  }

  async hasPurchasedContent(userId: string, contentItemId: number): Promise<boolean> {
    const [payment] = await db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.userId, userId),
          eq(payments.contentItemId, contentItemId),
          eq(payments.status, "succeeded")
        )
      );
    return !!payment;
  }

  // Download operations
  async createDownload(download: InsertDownload): Promise<Download> {
    const [downloadRecord] = await db
      .insert(downloads)
      .values(download)
      .returning();
    return downloadRecord;
  }

  async getDownloadHistory(userId: string): Promise<(Download & { contentItem: ContentItem })[]> {
    const result = await db
      .select()
      .from(downloads)
      .innerJoin(contentItems, eq(downloads.contentItemId, contentItems.id))
      .where(eq(downloads.userId, userId))
      .orderBy(desc(downloads.downloadedAt));

    return result.map((row) => ({
      ...row.downloads,
      contentItem: row.content_items,
    }));
  }

  async hasDownloadAccess(userId: string, contentItemId: number): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    // Check if user has selected this content as free
    const [freeSelection] = await db
      .select()
      .from(freeSelections)
      .where(
        and(
          eq(freeSelections.userId, userId),
          eq(freeSelections.contentItemId, contentItemId)
        )
      );
    
    if (freeSelection) return true;

    // Check if user has purchased this content individually
    const hasPurchased = await this.hasPurchasedContent(userId, contentItemId);
    if (hasPurchased) return true;

    // Check if user has package access
    const contentItem = await this.getContentItem(contentItemId);
    if (!contentItem) return false;

    // If user has "all remaining content" package, they have access to everything
    if (user.hasAllRemainingContent) return true;

    // If user has "additional 3 videos" package, they have access to videos (but not headshots)
    if (user.hasAdditional3Videos && contentItem.type === "video") return true;

    return false;
  }

  // Package purchase operations
  async updateUserPackagePurchase(userId: string, packageType: string): Promise<void> {
    if (packageType === "additional_3_videos") {
      await db
        .update(users)
        .set({ hasAdditional3Videos: true })
        .where(eq(users.id, userId));
    } else if (packageType === "all_remaining_content") {
      await db
        .update(users)
        .set({ hasAllRemainingContent: true })
        .where(eq(users.id, userId));
    }
  }

  async hasPackageAccess(userId: string, packageType: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) return false;

    if (packageType === "additional_3_videos") {
      return user.hasAdditional3Videos;
    } else if (packageType === "all_remaining_content") {
      return user.hasAllRemainingContent;
    }

    return false;
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllContentItems(): Promise<ContentItem[]> {
    return await db.select().from(contentItems).orderBy(desc(contentItems.createdAt));
  }
}

export const storage = new DatabaseStorage();
