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
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, desc, count, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (custom auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updateData: Partial<User>): Promise<void>;
  updateUserStripeCustomerId(userId: string, customerId: string): Promise<void>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<void>;
  setupUserPassword(userId: string, hashedPassword: string): Promise<void>;

  // Content operations
  getContentItems(userId: string): Promise<ContentItem[]>;
  getContentItem(id: number): Promise<ContentItem | undefined>;
  getContentItemsByUser(userId: string): Promise<ContentItem[]>;
  getContentItemsByProject(projectId: string): Promise<ContentItem[]>;
  createContentItem(contentItem: InsertContentItem): Promise<ContentItem>;
  deleteContentItem(id: number): Promise<void>;

  // Project-based selection operations
  createProjectSelection(selection: InsertProjectSelection): Promise<ProjectSelection>;
  selectProjectContent(userId: string, projectId: string, contentItemId: number, selectionType: string): Promise<void>;
  getProjectSelections(userId: string, projectId: string): Promise<ProjectSelection[]>;
  getFreeSelections(userId: string): Promise<any[]>; // For backward compatibility
  canSelectFreeContent(userId: string, projectId: string): Promise<boolean>;

  // Project payment operations
  createProjectPayment(payment: InsertProjectPayment): Promise<ProjectPayment>;
  createPayment(payment: any): Promise<any>; // For backward compatibility
  getProjectPaymentByStripeId(stripePaymentIntentId: string): Promise<ProjectPayment | undefined>;
  updateProjectPaymentStatus(stripePaymentIntentId: string, status: string): Promise<void>;
  updatePaymentStatus(stripePaymentIntentId: string, status: string): Promise<void>; // For backward compatibility
  hasProjectPackageAccess(userId: string, projectId: string, packageType: string): Promise<boolean>;
  hasPackageAccess(userId: string, packageType: string): Promise<boolean>; // For backward compatibility
  updateUserPackagePurchase(userId: string, packageType: string): Promise<void>;

  // Download operations
  createDownload(download: InsertDownload): Promise<Download>;
  getDownloadHistory(userId: string): Promise<(Download & { contentItem: ContentItem })[]>;
  hasDownloadAccess(userId: string, contentItemId: number): Promise<boolean>;
  hasPurchasedContent(userId: string, contentItemId: number): Promise<boolean>; // For backward compatibility

  // Project operations
  getUserProjects(userId: string): Promise<(Project & { videos: ContentItem[]; headshots: ContentItem[]; totalItems: number })[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updateData: Partial<Project>): Promise<Project>;
  updateProjectName(id: string, name: string): Promise<void>;
  getContentByProjectId(projectId: string): Promise<ContentItem[]>;
  getDownloadsByUserId(userId: string): Promise<(Download & { contentItem: ContentItem })[]>;
  reassignProject(projectId: string, newUserId: string): Promise<void>;
  deleteProject(id: string): Promise<void>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAllContentItems(): Promise<ContentItem[]>;
  getAllProjects(): Promise<(Project & { user: User; contentCount: number })[]>;
  deleteContentItem(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const { id, ...insertData } = userData;
    const [user] = await db
      .insert(users)
      .values(insertData as any)
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Try to find existing user
    const existingUser = userData.id ? await this.getUser(userData.id) : await this.getUserByEmail(userData.email);
    
    if (existingUser) {
      // Update existing user - only update non-undefined fields
      const updateData: Record<string, any> = {};
      if (userData.email !== undefined) updateData.email = userData.email;
      if (userData.firstName !== undefined) updateData.firstName = userData.firstName;
      if (userData.lastName !== undefined) updateData.lastName = userData.lastName;
      if (userData.password !== undefined) updateData.password = userData.password;
      if (userData.profileImageUrl !== undefined) updateData.profileImageUrl = userData.profileImageUrl;
      if (userData.stripeCustomerId !== undefined) updateData.stripeCustomerId = userData.stripeCustomerId;
      if (userData.freeVideoSelectionsUsed !== undefined) updateData.freeVideoSelectionsUsed = userData.freeVideoSelectionsUsed;
      if (userData.freeHeadshotSelectionsUsed !== undefined) updateData.freeHeadshotSelectionsUsed = userData.freeHeadshotSelectionsUsed;
      if (userData.hasAdditional3Videos !== undefined) updateData.hasAdditional3Videos = userData.hasAdditional3Videos;
      if (userData.hasAllRemainingContent !== undefined) updateData.hasAllRemainingContent = userData.hasAllRemainingContent;
      if (userData.isAdmin !== undefined) updateData.isAdmin = userData.isAdmin;
      if (userData.needsPasswordSetup !== undefined) updateData.needsPasswordSetup = userData.needsPasswordSetup;
      
      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, existingUser.id))
        .returning();
      return updated;
    } else {
      // Create new user
      const { id, ...insertData } = userData;
      const [created] = await db
        .insert(users)
        .values(insertData as any)
        .returning();
      return created;
    }
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set(updateData as any)
      .where(eq(users.id, id));
  }

  async updateUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
    await db
      .update(users)
      .set({ stripeCustomerId: customerId } as any)
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        needsPasswordSetup: false
      } as any)
      .where(eq(users.id, userId));
  }

  async setupUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        needsPasswordSetup: false
      } as any)
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

  // Project-based selection operations
  async createProjectSelection(selection: InsertProjectSelection): Promise<ProjectSelection> {
    const [created] = await db
      .insert(projectSelections)
      .values(selection)
      .returning();
    return created;
  }

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

  async getFreeSelections(userId: string): Promise<any[]> {
    // Backward compatibility - return all free selections across all projects for this user
    return await db
      .select()
      .from(projectSelections)
      .where(and(
        eq(projectSelections.userId, userId),
        eq(projectSelections.selectionType, 'free')
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

  async createPayment(payment: any): Promise<any> {
    // Backward compatibility wrapper for createProjectPayment
    return this.createProjectPayment(payment);
  }

  async updatePaymentStatus(stripePaymentIntentId: string, status: string): Promise<void> {
    // Backward compatibility wrapper
    return this.updateProjectPaymentStatus(stripePaymentIntentId, status);
  }

  async hasPackageAccess(userId: string, packageType: string): Promise<boolean> {
    // Backward compatibility - this would need a project context in practice
    // For now, return false as this method should use hasProjectPackageAccess instead
    return false;
  }

  async updateUserPackagePurchase(userId: string, packageType: string): Promise<void> {
    // This method doesn't make sense in project-based system
    // Package purchases are already tracked in projectPayments table
    // No additional user-level tracking needed
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
    console.log('🔍 Checking package access:', { userId, projectId, packageType });
    
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
    
    console.log('🔍 Found payment:', payment);
    console.log('🔍 Returning access:', !!payment);
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

  async hasPurchasedContent(userId: string, contentItemId: number): Promise<boolean> {
    // Backward compatibility - check if user has purchased any package that gives access to this content
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

    return hasAdditional3Access || hasAllContentAccess;
  }

  // Project operations
  async getUserProjects(userId: string): Promise<(Project & { videos: ContentItem[]; headshots: ContentItem[]; totalItems: number })[]> {
    // Get all projects for the user
    const userProjects = await db.select().from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));

    // Get all content for each project
    const result = await Promise.all(
      userProjects.map(async (project) => {
        const content = await db.select()
          .from(contentItems)
          .where(eq(contentItems.projectId, project.id))
          .orderBy(desc(contentItems.createdAt));

        const videos = content.filter(item => item.type === 'video');
        const headshots = content.filter(item => item.type === 'headshot');

        return {
          ...project,
          videos,
          headshots,
          totalItems: content.length,
        };
      })
    );

    return result;
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

  async updateProject(id: string, updateData: Partial<Project>): Promise<Project> {
    const [updated] = await db.update(projects)
      .set(updateData as any)
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  async updateProjectName(id: string, name: string): Promise<void> {
    await db.update(projects)
      .set({ name })
      .where(eq(projects.id, id));
  }

  async getContentByProjectId(projectId: string): Promise<ContentItem[]> {
    return this.getContentItemsByProject(projectId);
  }

  async getDownloadsByUserId(userId: string): Promise<(Download & { contentItem: ContentItem })[]> {
    return this.getDownloadHistory(userId);
  }

  async reassignProject(projectId: string, newUserId: string): Promise<void> {
    // Update the project's userId
    await db.update(projects)
      .set({ userId: newUserId })
      .where(eq(projects.id, projectId));

    // Update all content items in this project to be owned by the new user
    await db.update(contentItems)
      .set({ userId: newUserId })
      .where(eq(contentItems.projectId, projectId));
  }

  async deleteProject(id: string): Promise<void> {
    // Get all content items in this project first to delete related records
    const projectContentItems = await db
      .select({ id: contentItems.id })
      .from(contentItems)
      .where(eq(contentItems.projectId, id));
    
    const contentItemIds = projectContentItems.map(item => item.id);
    
    // Delete all related records in the correct order to avoid foreign key constraint violations
    
    // 1. Delete downloads that reference content items in this project
    if (contentItemIds.length > 0) {
      await db.delete(downloads).where(
        inArray(downloads.contentItemId, contentItemIds)
      );
    }
    
    // 2. Delete project selections
    await db.delete(projectSelections).where(eq(projectSelections.projectId, id));
    
    // 3. Delete project payments
    await db.delete(projectPayments).where(eq(projectPayments.projectId, id));
    
    // 4. Delete content items in this project
    await db.delete(contentItems).where(eq(contentItems.projectId, id));
    
    // 5. Finally delete the project itself
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllContentItems(): Promise<ContentItem[]> {
    return await db.select().from(contentItems).orderBy(desc(contentItems.createdAt));
  }

  async getAllProjects(): Promise<(Project & { user: User; contentCount: number })[]> {
    const result = await db
      .select({
        project: projects,
        user: users,
        contentCount: count(contentItems.id),
      })
      .from(projects)
      .leftJoin(users, eq(projects.userId, users.id))
      .leftJoin(contentItems, eq(projects.id, contentItems.projectId))
      .groupBy(projects.id, users.id)
      .orderBy(desc(projects.createdAt));

    return result.map((row) => ({
      ...row.project,
      user: row.user!,
      contentCount: row.contentCount || 0,
    }));
  }

  async deleteContentItem(id: number): Promise<void> {
    await db.delete(contentItems).where(eq(contentItems.id, id));
  }
}

export const storage = new DatabaseStorage();
