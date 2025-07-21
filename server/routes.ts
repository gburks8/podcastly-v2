import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import { insertContentItemSchema } from "@shared/schema";
import { z } from "zod";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs/promises";

// Only initialize Stripe if secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Function to get video metadata
async function getVideoMetadata(videoPath: string): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('Error getting video metadata:', err);
        reject(err);
        return;
      }
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream || !videoStream.width || !videoStream.height) {
        reject(new Error('No video stream found'));
        return;
      }
      
      const width = videoStream.width;
      const height = videoStream.height;
      const aspectRatio = width / height;
      
      resolve({ width, height, aspectRatio });
    });
  });
}

// Function to generate video thumbnail
async function generateVideoThumbnail(videoPath: string, videoWidth?: number, videoHeight?: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const thumbnailFilename = `thumb-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    const thumbnailPath = path.join('uploads/thumbnails', thumbnailFilename);
    
    // Ensure thumbnails directory exists
    fs.mkdir('uploads/thumbnails', { recursive: true }).catch(() => {});
    
    // Calculate thumbnail size based on video dimensions
    let thumbnailSize = '320x180'; // Default 16:9 fallback
    if (videoWidth && videoHeight) {
      // For vertical videos, generate a proper vertical thumbnail
      // For horizontal videos, use standard dimensions
      const aspectRatio = videoWidth / videoHeight;
      if (aspectRatio < 1) {
        // Vertical video - generate vertical thumbnail
        // Use 180 width (reasonable size) and calculate height
        const width = 180;
        const height = Math.round(width / aspectRatio);
        thumbnailSize = `${width}x${height}`;
      } else {
        // Horizontal video - use 320 width
        const width = 320;
        const height = Math.round(width / aspectRatio);
        thumbnailSize = `${width}x${height}`;
      }
    }
    
    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['00:00:01'], // Take screenshot at 1 second
        filename: thumbnailFilename,
        folder: 'uploads/thumbnails/',
        size: thumbnailSize
      })
      .on('end', () => {
        resolve(`/uploads/thumbnails/${thumbnailFilename}`);
      })
      .on('error', (err) => {
        console.error('Error generating thumbnail:', err);
        reject(err);
      });
  });
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      // Organize uploads by content type
      if (file.fieldname === 'video') {
        cb(null, 'uploads/videos/');
      } else if (file.fieldname === 'headshot' || file.fieldname === 'image') {
        cb(null, 'uploads/headshots/');
      } else if (file.fieldname === 'thumbnail') {
        cb(null, 'uploads/thumbnails/');
      } else {
        cb(null, 'uploads/');
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, `${file.fieldname}-${uniqueSuffix}-${sanitizedName}`);
    }
  }),
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

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

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
      
      await storage.selectFreeContent(userId, contentId);
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
      
      const hasAccess = await storage.hasDownloadAccess(userId, contentId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      const contentItem = await storage.getContentItem(contentId);
      if (!contentItem) {
        return res.status(404).json({ message: "Content not found" });
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
      
      // Update payment status
      await storage.updatePaymentStatus(paymentIntent.id, "succeeded");

      // If it's a package purchase, update user's package status
      if (paymentIntent.metadata?.packageType && paymentIntent.metadata?.userId) {
        await storage.updateUserPackagePurchase(
          paymentIntent.metadata.userId,
          paymentIntent.metadata.packageType
        );
      }
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

      // Generate thumbnail and extract metadata for video files
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
          const metadata = await getVideoMetadata(videoPath);
          width = metadata.width;
          height = metadata.height;
          aspectRatio = metadata.aspectRatio;
          
          // Generate thumbnail from video
          thumbnailUrl = await generateVideoThumbnail(videoPath, width, height);
        } catch (error) {
          console.error('Failed to process video:', error);
          // Continue without thumbnail and metadata if processing fails
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
      };

      const validatedData = insertContentItemSchema.parse(contentData);
      const contentItem = await storage.createContentItem(validatedData);

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

  const httpServer = createServer(app);
  return httpServer;
}
