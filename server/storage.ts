import {
  users,
  contentItems,
  downloads,
  projects,
  projectSelections,
  projectPayments,
  type User,
  type UpsertUser,
  type ContentItem,
  type InsertContentItem,
  type Download,
  type InsertDownload,
  type Project,
  type InsertProject,
  type ProjectSelection,
  type InsertProjectSelection,
  type ProjectPayment,
  type InsertProjectPayment,
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
  getContentItemsByProject(projectId: string): Promise<ContentItem[]>;
  createContentItem(contentItem: InsertContentItem): Promise<ContentItem>;
  deleteContentItem(id: number): Promise<void>;

  // Project-based selection operations
  selectProjectContent(userId: string, projectId: string, contentItemId: number, selectionType: string): Promise<void>;
  getProjectSelections(userId: string, projectId: string): Promise<ProjectSelection[]>;
  canSelectFreeContent(userId: string, projectId: string): Promise<boolean>;

  // Project payment operations
  createProjectPayment(payment: InsertProjectPayment): Promise<ProjectPayment>;
  getProjectPaymentByStripeId(stripePaymentIntentId: string): Promise<ProjectPayment | undefined>;
  updateProjectPaymentStatus(stripePaymentIntentId: string, status: string): Promise<void>;
  hasProjectPackageAccess(userId: string, projectId: string, packageType: string): Promise<boolean>;

  // Download operations
  createDownload(download: InsertDownload): Promise<Download>;
  getDownloadHistory(userId: string): Promise<(Download & { contentItem: ContentItem })[]>;
  hasDownloadAccess(userId: string, contentItemId: number): Promise<boolean>;

  // Project operations
  getUserProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProjectName(id: string, name: string): Promise<void>;
  deleteProject(id: string): Promise<void>;

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

  async getContentItemsByProject(projectId: string): Promise<ContentItem[]> {
    return await db
      .select()
      .from(contentItems)
      .where(eq(contentItems.projectId, projectId))
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

  // Project-based selection operations
  async selectProjectContent(userId: string, projectId: string, contentItemId: number, selectionType: string): Promise<void> {
    await db.insert(projectSelections).values({
      userId,
      projectId,
      contentItemId,
      selectionType,
    });
  }

  async getProjectSelections(userId: string, projectId: string): Promise<ProjectSelection[]> {
    return await db
      .select()
      .from(projectSelections)
      .where(and(
        eq(projectSelections.userId, userId),
        eq(projectSelections.projectId, projectId)
      ))
      .orderBy(desc(projectSelections.selectedAt));
  }

  async canSelectFreeContent(userId: string, projectId: string): Promise<boolean> {
    const freeSelections = await db
      .select()
      .from(projectSelections)
      .where(and(
        eq(projectSelections.userId, userId),
        eq(projectSelections.projectId, projectId),
        eq(projectSelections.selectionType, 'free')
      ));
    
    const project = await this.getProject(projectId);
    if (!project) return false;
    
    return freeSelections.length < (project.freeVideoLimit || 3);
  }

  // Project payment operations
  async createProjectPayment(payment: InsertProjectPayment): Promise<ProjectPayment> {
    const [paymentRecord] = await db
      .insert(projectPayments)
      .values(payment)
      .returning();
    return paymentRecord;
  }

  async getProjectPaymentByStripeId(stripePaymentIntentId: string): Promise<ProjectPayment | undefined> {
    const [payment] = await db
      .select()
      .from(projectPayments)
      .where(eq(projectPayments.stripePaymentIntentId, stripePaymentIntentId));
    return payment;
  }

  async updateProjectPaymentStatus(stripePaymentIntentId: string, status: string): Promise<void> {
    await db
      .update(projectPayments)
      .set({ status })
      .where(eq(projectPayments.stripePaymentIntentId, stripePaymentIntentId));
  }

  async hasProjectPackageAccess(userId: string, projectId: string, packageType: string): Promise<boolean> {
    const [payment] = await db
      .select()
      .from(projectPayments)
      .where(
        and(
          eq(projectPayments.userId, userId),
          eq(projectPayments.projectId, projectId),
          eq(projectPayments.packageType, packageType),
          eq(projectPayments.status, "succeeded")
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
    // Get content item to determine project
    const contentItem = await this.getContentItem(contentItemId);
    if (!contentItem || !contentItem.projectId) return false;

    // Check if user has selected this content as free
    const [selection] = await db
      .select()
      .from(projectSelections)
      .where(
        and(
          eq(projectSelections.userId, userId),
          eq(projectSelections.contentItemId, contentItemId)
        )
      );
    
    if (selection) return true;

    // Check if user has package access for this project
    const hasAdditional3Access = await this.hasProjectPackageAccess(userId, contentItem.projectId, 'additional_3_videos');
    const hasAllContentAccess = await this.hasProjectPackageAccess(userId, contentItem.projectId, 'all_content');

    // If user has "all content" package, they have access to everything in the project
    if (hasAllContentAccess) return true;

    // If user has "additional 3 videos" package, they have access to videos (but not headshots)
    if (hasAdditional3Access && contentItem.type === "video") {
      // Check they haven't exceeded the limit (3 free + 3 additional = 6 total videos)
      const allSelections = await this.getProjectSelections(userId, contentItem.projectId);
      const videoSelections = allSelections.filter(s => s.selectionType === 'free' || s.selectionType === 'additional_3');
      return videoSelections.length < 6;
    }

    return false;
  }



  // Project operations
  async getUserProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects)
      .values(projectData)
      .returning();
    return project;
  }

  async updateProjectName(id: string, name: string): Promise<void> {
    await db.update(projects)
      .set({ name, updatedAt: new Date() })
      .where(eq(projects.id, id));
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
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
