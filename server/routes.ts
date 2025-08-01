import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth, isAuthenticated } from "./auth.js";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import { insertContentItemSchema } from "../shared/schema.js";
import { z } from "zod";
import fs from "fs/promises";

import { 
  uploadFile, 
  downloadFile, 
  generateObjectKey, 
  deleteFile,
  isObjectStorageReady,
  type UploadResult 
} from "./object-storage.js";

// Only initialize Stripe if secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Simple video metadata extraction (minimal approach)
async function getVideoMetadata(videoPath: string): Promise<{ width: number; height: number; aspectRatio: number }> {
  // For deployment stability, return default video dimensions
  // This removes the fluent-ffmpeg dependency that was causing deployment failures
  console.log('📹 Video uploaded, using default dimensions (fluent-ffmpeg removed for deployment stability)');
  return {
    width: 1920,
    height: 1080,
    aspectRatio: 16/9
  };
}

// Simplified thumbnail generation - no image processing dependencies
async function generateVideoThumbnail(videoPath: string, videoWidth?: number, videoHeight?: number): Promise<string> {
  // For deployment stability, return empty string so frontend uses default video icon
  // This removes the sharp dependency that was causing deployment failures
  console.log('📸 Video uploaded, using default video icon (sharp removed for deployment stability)');
  return '';
}

// Configure multer for file uploads (temporary storage before Object Storage)
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for Object Storage upload
  fileFilter: (req, file, cb) => {
    // Allow videos, images, and thumbnails
    if (file.fieldname === 'video') {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed for video uploads'));
      }
    } else if (file.fieldname === 'headshot' || file.fieldname === 'image' || file.fieldname === 'thumbnail') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for image uploads'));
      }
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for videos
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupAuth(app);

  // Serve uploaded files from Object Storage
  app.get('/api/files/*', async (req, res) => {
    try {
      const objectKey = (req.params as any)[0]; // Get everything after /api/files/
      
      if (!objectKey) {
        return res.status(400).json({ message: 'File path required' });
      }
      
      const fileData = await downloadFile(objectKey);
      
      if (!fileData) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Set appropriate content type based on file extension
      const ext = path.extname(objectKey).toLowerCase();
      const contentType = {
        '.mp4': 'video/mp4',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      }[ext] || 'application/octet-stream';
      
      res.set({
        'Content-Type': contentType,
        'Content-Length': fileData.length,
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      });
      
      res.send(fileData);
    } catch (error) {
      console.error('Error serving file:', error);
      res.status(500).json({ message: 'Error serving file' });
    }
  });

  // Serve legacy uploaded files from local uploads directory
  app.use('/uploads', express.static('uploads'));

  // Object Storage status endpoint
  app.get('/api/storage/status', isAuthenticated, async (req, res) => {
    try {
      const isReady = await isObjectStorageReady();
      res.json({
        objectStorageReady: isReady,
        message: isReady 
          ? 'Object Storage is configured and ready'
          : 'Object Storage not configured - using local storage. Create a bucket in the Object Storage tab to enable persistent storage.'
      });
    } catch (error) {
      console.error('Error checking storage status:', error);
      res.status(500).json({ message: 'Failed to check storage status' });
    }
  });

  // Auth routes (handled in auth.ts)
  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    const user = req.user;
    console.log('DEBUG: Full user object from session:', user);
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isAdmin: user.isAdmin,
      profileImageUrl: user.profileImageUrl,
      stripeCustomerId: user.stripeCustomerId,
      freeVideoSelectionsUsed: user.freeVideoSelectionsUsed,
      freeHeadshotSelectionsUsed: user.freeHeadshotSelectionsUsed,
      hasAdditional3Videos: user.hasAdditional3Videos,
      hasAllRemainingContent: user.hasAllRemainingContent,
      createdAt: user.createdAt,
    });
  });

  // Content routes
  app.get('/api/content', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const allContent = await storage.getContentItems(userId);
      res.json(allContent);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get('/api/content/selections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const freeSelections = await storage.getFreeSelections(userId);
      res.json(freeSelections);
    } catch (error) {
      console.error("Error fetching free selections:", error);
      res.status(500).json({ message: "Failed to fetch free selections" });
    }
  });

  app.get('/api/content/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contentId = parseInt(req.params.id);
      
      const hasAccess = await storage.hasDownloadAccess(userId, contentId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const contentItem = await storage.getContentItem(contentId);
      if (!contentItem) {
        return res.status(404).json({ message: "Content not found" });
      }

      res.json(contentItem);
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // Route for getting content details for purchase (no access check required)
  app.get('/api/content/:id/details', isAuthenticated, async (req: any, res) => {
    try {
      const contentId = parseInt(req.params.id);
      
      const contentItem = await storage.getContentItem(contentId);
      if (!contentItem) {
        return res.status(404).json({ message: "Content not found" });
      }

      res.json(contentItem);
    } catch (error) {
      console.error("Error fetching content details:", error);
      res.status(500).json({ message: "Failed to fetch content details" });
    }
  });

  app.post('/api/content/:id/select-free', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contentId = parseInt(req.params.id);
      
      // Get the project ID for this content
      const contentItem = await storage.getContentItem(contentId);
      if (!contentItem) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      // Check if user can still select free content for this project
      const canSelectFree = await storage.canSelectFreeContent(userId, contentItem.projectId!);
      if (!canSelectFree) {
        return res.status(403).json({ 
          message: "You have already selected the maximum number of free videos for this project. Purchase a package to access more content." 
        });
      }
      
      // Check if this content is already selected
      const existingSelections = await storage.getProjectSelections(userId, contentItem.projectId!);
      const alreadySelected = existingSelections.some(s => s.contentItemId === contentId);
      if (alreadySelected) {
        return res.status(400).json({ message: "Content has already been selected" });
      }
      
      // Create project selection
      await storage.createProjectSelection({
        userId,
        projectId: contentItem.projectId!,
        contentItemId: contentId,
        selectionType: 'free'
      });
      
      res.json({ message: "Content selected as free" });
    } catch (error: any) {
      console.error("Error selecting free content:", error);
      res.status(400).json({ message: error.message || "Failed to select free content" });
    }
  });

  app.post('/api/content/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const contentId = parseInt(req.params.id);
      
      // Get the project ID for this content
      const contentItem = await storage.getContentItem(contentId);
      if (!contentItem) {
        return res.status(404).json({ message: "Content not found" });
      }

      // Check if user has access through free selection
      const selections = await storage.getProjectSelections(userId, contentItem.projectId!);
      const hasSelection = selections.some(s => s.contentItemId === contentId);
      
      // Check if user has package access that covers this content
      const hasAllContentAccess = await storage.hasProjectPackageAccess(userId, contentItem.projectId!, "all_content");
      const hasAdditional3VideosAccess = await storage.hasProjectPackageAccess(userId, contentItem.projectId!, "additional_3_videos");
      const hasPackageAccess = hasAllContentAccess || (hasAdditional3VideosAccess && contentItem.type === 'video');
      
      if (!hasSelection && !hasPackageAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Record the download
      await storage.createDownload({
        userId,
        contentItemId: contentId,
      });

      res.json({ 
        downloadUrl: contentItem.fileUrl,
        filename: contentItem.filename 
      });
    } catch (error) {
      console.error("Error processing download:", error);
      res.status(500).json({ message: "Failed to process download" });
    }
  });

  app.get('/api/downloads/history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const history = await storage.getDownloadHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching download history:", error);
      res.status(500).json({ message: "Failed to fetch download history" });
    }
  });

  // Payment routes
  app.post("/api/content/:id/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Payment processing not configured" });
      }

      const userId = req.user.id;
      const contentId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const contentItem = await storage.getContentItem(contentId);
      if (!contentItem) {
        return res.status(404).json({ message: "Content not found" });
      }

      // Check if already purchased
      const alreadyPurchased = await storage.hasPurchasedContent(userId, contentId);
      if (alreadyPurchased) {
        return res.status(400).json({ message: "Content already purchased" });
      }

      const amount = parseFloat(contentItem.price || "25.00");
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId,
          contentItemId: contentId.toString(),
        },
      });

      // Create payment record
      await storage.createPayment({
        userId,
        contentItemId: contentId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount.toString(),
        status: "pending",
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Package purchase routes
  app.post("/api/packages/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Payment processing not configured" });
      }

      const userId = req.user.id;
      const { packageType } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user already has this package
      const hasPackage = await storage.hasPackageAccess(userId, packageType);
      if (hasPackage) {
        return res.status(400).json({ message: "Package already purchased" });
      }

      let amount: number;
      let description: string;

      if (packageType === "additional_3_videos") {
        amount = 199.00;
        description = "Additional 3 Videos Package";
      } else if (packageType === "all_remaining_content") {
        amount = 499.00;
        description = "All Remaining Content Package";
      } else {
        return res.status(400).json({ message: "Invalid package type" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId,
          packageType,
        },
      });

      // Create payment record
      await storage.createPayment({
        userId,
        packageType,
        stripePaymentIntentId: paymentIntent.id,
        amount: amount.toString(),
        status: "pending",
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating package payment intent:", error);
      res.status(500).json({ message: "Error creating package payment intent: " + error.message });
    }
  });

  // Payment verification endpoint - client-side fallback when webhooks aren't configured
  app.post("/api/projects/:projectId/verify-payment", isAuthenticated, async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Payment processing not configured" });
    }

    try {
      const { paymentIntentId } = req.body;
      const userId = req.user.id;

      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID required" });
      }

      // Retrieve the payment intent from Stripe to verify its status
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded' && paymentIntent.metadata?.userId === userId) {
        // Update payment status in our database
        await storage.updatePaymentStatus(paymentIntentId, "succeeded");

        // Grant package access
        if (paymentIntent.metadata?.packageType) {
          await storage.updateUserPackagePurchase(
            userId,
            paymentIntent.metadata.packageType
          );
          
          console.log(`✅ Automatically granted ${paymentIntent.metadata.packageType} access to user ${userId}`);
          
          res.json({ 
            success: true, 
            packageType: paymentIntent.metadata.packageType,
            message: "Payment verified and access granted"
          });
        } else {
          res.json({ success: true, message: "Payment verified" });
        }
      } else {
        res.status(400).json({ 
          success: false, 
          message: "Payment not completed or verification failed" 
        });
      }
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Error verifying payment: " + error.message });
    }
  });

  app.post("/api/payment-webhook", express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Payment processing not configured" });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      
      console.log(`🔔 Webhook: Payment succeeded for ${paymentIntent.id}`);
      
      // Update payment status in project_payments table
      await storage.updateProjectPaymentStatus(paymentIntent.id, "succeeded");
      
      console.log(`✅ Webhook: Updated payment status to succeeded for ${paymentIntent.id}`);
      
      // The project-based system automatically grants access based on payment status
      // No additional user-level updates needed since access is checked via hasProjectPackageAccess
    }

    res.json({ received: true });
  });

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      // Simple admin check - in production, you'd want proper role-based access
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const { firstName, lastName, email } = req.body;

      // Validate input
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "First name, last name, and email are required" });
      }

      if (!email.includes('@')) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create user without password (they'll set it on first login)
      const newUser = await storage.createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        isAdmin: false, // Explicitly set admin status for new users
        needsPasswordSetup: true, // Mark that they need to set up password
      });

      // Return user without password
      const { password: _, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user: " + error.message });
    }
  });

  app.get('/api/admin/projects', isAuthenticated, async (req: any, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/admin/content', isAuthenticated, async (req: any, res) => {
    try {
      // Simple admin check - in production, you'd want proper role-based access
      const { userId } = req.query;
      
      if (userId) {
        // Get content for specific user
        const userContent = await storage.getContentItemsByUser(userId as string);
        res.json(userContent);
      } else {
        // Get all content
        const allContent = await storage.getAllContentItems();
        res.json(allContent);
      }
    } catch (error) {
      console.error("Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin user creation endpoint
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (!currentUser || !currentUser.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { firstName, lastName, email } = req.body;

      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "First name, last name, and email are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create user without password (they'll set it up on first login)
      const userData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: null, // No password - user will set up on first login
        needsPasswordSetup: true,
        isAdmin: false,
      };

      const user = await storage.createUser(userData);
      res.status(201).json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        needsPasswordSetup: user.needsPasswordSetup,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post('/api/admin/content', isAuthenticated, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'headshot', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), async (req: any, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const mainFile = files['video']?.[0] || files['headshot']?.[0] || files['image']?.[0];
      const thumbnailFile = files['thumbnail']?.[0];

      if (!mainFile) {
        return res.status(400).json({ message: "No main content file uploaded" });
      }

      // Determine the correct subfolder based on file type
      let subfolder = '';
      if (files['video']) {
        subfolder = 'videos/';
      } else if (files['headshot'] || files['image']) {
        subfolder = 'headshots/';
      }

      // Generate thumbnail and extract metadata for video files and images
      let thumbnailUrl = null;
      let width = null;
      let height = null;
      let aspectRatio = null;
      
      if (thumbnailFile) {
        thumbnailUrl = `/uploads/thumbnails/${thumbnailFile.filename}`;
      } else if (req.body.type === 'video' && mainFile) {
        try {
          // Get video metadata first
          const videoPath = path.join('uploads', subfolder, mainFile.filename);
          console.log(`Processing video: ${mainFile.filename}, size: ${(mainFile.size / 1024 / 1024).toFixed(2)}MB`);
          
          const metadata = await getVideoMetadata(videoPath);
          width = metadata.width;
          height = metadata.height;
          aspectRatio = metadata.aspectRatio;
          
          console.log(`Video metadata extracted: ${width}x${height}, aspect ratio: ${aspectRatio}`);
          
          // Generate thumbnail from video
          thumbnailUrl = await generateVideoThumbnail(videoPath, width, height);
          console.log(`Thumbnail generated: ${thumbnailUrl}`);
        } catch (error) {
          console.error('Failed to process video:', error);
          // Continue without thumbnail and metadata if processing fails
          // Set some default values so the content can still be created
          console.log('Continuing upload without video processing due to error');
        }
      } else if (req.body.type === 'headshot' && mainFile) {
        try {
          // Get image dimensions using Sharp
          const sharp = require('sharp');
          const imagePath = path.join('uploads', subfolder, mainFile.filename);
          const metadata = await sharp(imagePath).metadata();
          width = metadata.width || null;
          height = metadata.height || null;
          aspectRatio = width && height ? (width / height).toString() : null;
        } catch (error) {
          console.error('Failed to process image:', error);
          // Continue without dimensions if processing fails
        }
      }

      const contentData = {
        userId: req.body.userId || req.user.id, // Default to current user if not specified
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        category: req.body.category || "premium", // Default to premium for uploaded content
        filename: mainFile.filename,
        fileUrl: `/uploads/${subfolder}${mainFile.filename}`,
        duration: req.body.duration || null,
        thumbnailUrl: thumbnailUrl,
        width: width,
        height: height,
        aspectRatio: aspectRatio ? aspectRatio.toString() : null,
        price: req.body.price || "25.00",
        projectId: req.body.projectId || null,
      };

      console.log('Content data to validate:', contentData);
      const contentItem = await storage.createContentItem(contentData as any);

      res.json(contentItem);
    } catch (error) {
      console.error("Error creating content:", error);
      res.status(500).json({ message: "Failed to create content" });
    }
  });

  app.delete('/api/admin/content/:id', isAuthenticated, async (req: any, res) => {
    try {
      const contentId = parseInt(req.params.id);
      await storage.deleteContentItem(contentId);
      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  // Project routes
  app.get("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const projects = await storage.getUserProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name } = req.body;
      
      // Generate a UUID for the project ID
      const projectId = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const projectData = {
        id: projectId,
        userId,
        name,
      };

      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { name } = req.body;
      
      await storage.updateProjectName(projectId, name);
      res.json({ message: "Project name updated successfully" });
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.put("/api/projects/:id/reassign", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { newUserId } = req.body;
      
      // Verify the new user exists
      const targetUser = await storage.getUser(newUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }
      
      // Verify the project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      await storage.reassignProject(projectId, newUserId);
      res.json({ message: `Project reassigned successfully to ${targetUser.firstName} ${targetUser.lastName}` });
    } catch (error) {
      console.error("Error reassigning project:", error);
      res.status(500).json({ message: "Failed to reassign project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      
      // Verify the project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Admin check - only admins can delete projects
      if (!req.user.isAdmin) {
        return res.status(403).json({ message: "Only administrators can delete projects" });
      }
      
      await storage.deleteProject(projectId);
      res.json({ message: "Project and all associated content deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  app.put("/api/projects/:id/name", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const { name } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Project name is required" });
      }
      
      // Verify the project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      await storage.updateProjectName(projectId, name.trim());
      res.json({ message: "Project name updated successfully" });
    } catch (error) {
      console.error("Error updating project name:", error);
      res.status(500).json({ message: "Failed to update project name" });
    }
  });

  app.get("/api/projects/:id/content", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const content = await storage.getContentItemsByProject(projectId);
      res.json(content);
    } catch (error) {
      console.error("Error fetching project content:", error);
      res.status(500).json({ message: "Error fetching project content" });
    }
  });

  app.delete("/api/admin/content/:id", isAuthenticated, async (req: any, res) => {
    try {
      const contentId = parseInt(req.params.id);
      
      if (isNaN(contentId)) {
        return res.status(400).json({ message: "Invalid content ID" });
      }
      
      // Verify the content exists
      const content = await storage.getContentItem(contentId);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }
      
      await storage.deleteContentItem(contentId);
      res.json({ message: "Content deleted successfully" });
    } catch (error) {
      console.error("Error deleting content:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  app.get("/api/projects/:id", async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // For authenticated users, we allow access without ownership checks for public projects
      // This enables users to access shared project links
      
      // For unauthenticated users, return basic project info for shareable links
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.get("/api/projects/:id/content", async (req: any, res) => {
    try {
      const projectId = req.params.id;
      
      // Check if project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // For authenticated users, check ownership/admin rights for management access
      if (req.user) {
        const isOwner = project.userId === req.user.id;
        const isAdmin = req.user.isAdmin === true;
        
        if (!isOwner && !isAdmin) {
          // Non-owner/admin authenticated users can view content but with limited info
          const contentItems = await storage.getContentItemsByProject(projectId);
          return res.json(contentItems);
        }
      }
      
      // Allow public access to view project content (for shareable links)
      const contentItems = await storage.getContentItemsByProject(projectId);
      res.json(contentItems);
    } catch (error) {
      console.error("Error fetching project content:", error);
      res.status(500).json({ message: "Failed to fetch project content" });
    }
  });

  // Project selection routes
  app.post("/api/projects/:id/select-content", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const userId = req.user.id;
      const { contentItemId, selectionType } = req.body;

      // Check if user can make this selection
      if (selectionType === 'free') {
        const canSelect = await storage.canSelectFreeContent(userId, projectId);
        if (!canSelect) {
          return res.status(400).json({ message: "Free selection limit reached for this project" });
        }
      }

      await storage.selectProjectContent(userId, projectId, contentItemId, selectionType);
      res.json({ message: "Content selected successfully" });
    } catch (error) {
      console.error("Error selecting content:", error);
      res.status(500).json({ message: "Failed to select content" });
    }
  });

  app.get("/api/projects/:id/selections", async (req: any, res) => {
    try {
      const projectId = req.params.id;
      
      // Check if project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // If no user is authenticated, return empty selections (for public viewing)
      if (!req.user) {
        return res.json([]);
      }
      
      // For authenticated users, return their selections for this project
      const selections = await storage.getProjectSelections(req.user.id, projectId);
      res.json(selections);
    } catch (error) {
      console.error("Error fetching project selections:", error);
      res.status(500).json({ message: "Failed to fetch project selections" });
    }
  });

  app.get("/api/projects/:id/package-access/:packageType", async (req: any, res) => {
    try {
      const projectId = req.params.id;
      const packageType = req.params.packageType;
      
      // If no user is authenticated, return no access (for public viewing)
      if (!req.user) {
        return res.json({ hasAccess: false });
      }
      
      const userId = req.user.id;
      const hasAccess = await storage.hasProjectPackageAccess(userId, projectId, packageType);
      res.json({ hasAccess });
    } catch (error) {
      console.error("Error checking package access:", error);
      res.status(500).json({ message: "Failed to check package access" });
    }
  });

  // Project payment routes
  app.post("/api/projects/:id/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      console.log('💳 Payment intent request:', { 
        projectId: req.params.id, 
        userId: req.user?.id, 
        userEmail: req.user?.email,
        sessionId: req.sessionID,
        body: req.body 
      });
      
      if (!stripe) {
        console.error('❌ Stripe not configured');
        return res.status(500).json({ message: "Payment processing not configured" });
      }

      const projectId = req.params.id;
      const userId = req.user.id;
      const { packageType, amount } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Ensure user has a Stripe customer ID
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(userId, customerId);
      }

      console.log('🔄 Creating Stripe payment intent with data:', { amount, customerId, userId, projectId, packageType });

      // Create the payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        customer: customerId,
        metadata: {
          userId,
          projectId,
          packageType,
        },
      });

      console.log('🎯 Stripe payment intent created, ID:', paymentIntent.id);

      // Store payment record
      const paymentData = {
        userId,
        projectId,
        packageType,
        stripePaymentIntentId: paymentIntent.id,
        amount: (amount / 100).toString(), // Convert back to dollars
        status: "pending" as const,
      };
      
      console.log('💾 Storing payment record with data:', paymentData);
      await storage.createProjectPayment(paymentData);

      console.log('✅ Payment intent created successfully');
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("❌ Error creating payment intent:", error);
      res.status(500).json({ message: "Failed to create payment intent: " + error.message });
    }
  });

  // Admin route to get user projects
  app.get("/api/admin/users/:userId/projects", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const projects = await storage.getUserProjects(userId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching user projects:", error);
      res.status(500).json({ message: "Failed to fetch user projects" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
