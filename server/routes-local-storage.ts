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
import fs from "fs/promises";

// Only initialize Stripe if secret key is available
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Simple video metadata extraction (minimal approach)
async function getVideoMetadata(videoPath: string): Promise<{ width: number; height: number; aspectRatio: number }> {
  // For deployment stability, return default video dimensions
  console.log('📹 Video uploaded, using default dimensions');
  return {
    width: 1920,
    height: 1080,
    aspectRatio: 16/9
  };
}

// Simplified thumbnail generation - no image processing dependencies
async function generateVideoThumbnail(videoPath: string, videoWidth?: number, videoHeight?: number): Promise<string> {
  // For deployment stability, return empty string so frontend uses default video icon
  console.log('📸 Video uploaded, using default video icon');
  return '';
}

// Configure multer for local file storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = file.fieldname === 'video' ? 'uploads/videos' : 'uploads/headshots';
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
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

  // Health check endpoint for deployment
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      storage: 'local'
    });
  });

  // Serve uploaded files from local uploads directory
  app.use('/uploads', express.static('uploads', {
    setHeaders: (res, path) => {
      // Set appropriate content type and caching headers
      const ext = path.split('.').pop()?.toLowerCase();
      if (ext === 'mp4' || ext === 'mov' || ext === 'avi') {
        res.set('Content-Type', 'video/mp4');
      } else if (ext === 'jpg' || ext === 'jpeg') {
        res.set('Content-Type', 'image/jpeg');
      } else if (ext === 'png') {
        res.set('Content-Type', 'image/png');
      }
      res.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    }
  }));

  // User routes
  
  // Get current user
  app.get('/api/user', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Content routes

  // Get all content
  app.get('/api/content', isAuthenticated, async (req, res) => {
    try {
      const content = await storage.getAllContentItems();
      res.json(content);
    } catch (error) {
      console.error('Error fetching content:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get content by user ID (for admin use)
  app.get('/api/content/user/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const content = await storage.getContentByUserId(userId);
      res.json(content);
    } catch (error) {
      console.error('Error fetching user content:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Upload content with local storage
  app.post('/api/content/upload', isAuthenticated, upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'headshot', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { title, description, category, type, userId, projectId, projectName } = req.body;

      // Validate required fields
      if (!title || !type) {
        return res.status(400).json({ message: 'Title and type are required' });
      }

      // Handle project creation/assignment
      let finalProjectId = projectId;
      if (!finalProjectId && projectName) {
        try {
          const newProject = await storage.createProject({
            name: projectName,
            userId: userId || req.user!.id
          });
          finalProjectId = newProject.id;
        } catch (error) {
          console.error('Error creating project:', error);
          return res.status(500).json({ message: 'Error creating project' });
        }
      }

      const contentItems = [];

      // Process video upload
      if (files.video && files.video[0]) {
        const videoFile = files.video[0];
        const videoPath = videoFile.path;
        
        // Extract video metadata
        const metadata = await getVideoMetadata(videoPath);
        
        // Generate thumbnail (returns empty string for default icon)
        const thumbnailPath = await generateVideoThumbnail(videoPath, metadata.width, metadata.height);

        const contentItem = {
          title,
          description: description || '',
          type: 'video' as const,
          category: category || 'general',
          fileUrl: `/uploads/videos/${videoFile.filename}`,
          thumbnailUrl: thumbnailPath,
          metadata: {
            width: metadata.width,
            height: metadata.height,
            aspectRatio: metadata.aspectRatio,
            duration: 0,
            fileSize: videoFile.size,
            mimeType: videoFile.mimetype
          },
          userId: userId || req.user!.id,
          projectId: finalProjectId
        };

        const savedItem = await storage.createContentItem(contentItem);
        contentItems.push(savedItem);
      }

      // Process headshot upload
      if (files.headshot && files.headshot[0]) {
        const headshotFile = files.headshot[0];
        
        const contentItem = {
          title: title + ' - Headshot',
          description: description || '',
          type: 'headshot' as const,
          category: category || 'general',
          fileUrl: `/uploads/headshots/${headshotFile.filename}`,
          thumbnailUrl: `/uploads/headshots/${headshotFile.filename}`, // Use the image itself as thumbnail
          metadata: {
            width: 1920, // Default dimensions
            height: 1080,
            aspectRatio: 16/9,
            fileSize: headshotFile.size,
            mimeType: headshotFile.mimetype
          },
          userId: userId || req.user!.id,
          projectId: finalProjectId
        };

        const savedItem = await storage.createContentItem(contentItem);
        contentItems.push(savedItem);
      }

      res.json({ 
        success: true, 
        message: 'Content uploaded successfully',
        items: contentItems,
        projectId: finalProjectId
      });
    } catch (error) {
      console.error('Error uploading content:', error);
      res.status(500).json({ message: 'Error uploading content' });
    }
  });

  // Get content details by ID
  app.get('/api/content/:id/details', async (req, res) => {
    try {
      const { id } = req.params;
      const content = await storage.getContentItemById(id);
      
      if (!content) {
        return res.status(404).json({ message: 'Content not found' });
      }
      
      res.json(content);
    } catch (error) {
      console.error('Error fetching content details:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Delete content
  app.delete('/api/content/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get content details first to delete associated files
      const content = await storage.getContentItemById(id);
      if (content) {
        // Delete local files
        try {
          if (content.fileUrl && content.fileUrl.startsWith('/uploads/')) {
            await fs.unlink(content.fileUrl.slice(1)); // Remove leading slash
          }
          if (content.thumbnailUrl && content.thumbnailUrl.startsWith('/uploads/')) {
            await fs.unlink(content.thumbnailUrl.slice(1)); // Remove leading slash
          }
        } catch (fileError) {
          console.log('File deletion warning (file may not exist):', fileError);
        }
      }
      
      await storage.deleteContentItem(id);
      res.json({ success: true, message: 'Content deleted successfully' });
    } catch (error) {
      console.error('Error deleting content:', error);
      res.status(500).json({ message: 'Error deleting content' });
    }
  });

  // Project routes
  
  // Get all projects for current user
  app.get('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get project by ID with content
  app.get('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const project = await storage.getProjectById(id);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      const content = await storage.getContentByProjectId(id);
      
      res.json({
        ...project,
        content
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create new project
  app.post('/api/projects', isAuthenticated, async (req, res) => {
    try {
      const { name, userId } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Project name is required' });
      }
      
      const project = await storage.createProject({
        name,
        userId: userId || req.user!.id
      });
      
      res.json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Error creating project' });
    }
  });

  // Update project name
  app.patch('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Project name is required' });
      }
      
      const project = await storage.updateProject(id, { name });
      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ message: 'Error updating project' });
    }
  });

  // Reassign project to different user
  app.patch('/api/projects/:id/reassign', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const project = await storage.updateProject(id, { userId });
      res.json(project);
    } catch (error) {
      console.error('Error reassigning project:', error);
      res.status(500).json({ message: 'Error reassigning project' });
    }
  });

  // Delete project and all associated content
  app.delete('/api/projects/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get all content in the project first
      const content = await storage.getContentByProjectId(id);
      
      // Delete associated local files
      for (const item of content) {
        try {
          if (item.fileUrl && item.fileUrl.startsWith('/uploads/')) {
            await fs.unlink(item.fileUrl.slice(1));
          }
          if (item.thumbnailUrl && item.thumbnailUrl.startsWith('/uploads/')) {
            await fs.unlink(item.thumbnailUrl.slice(1));
          }
        } catch (fileError) {
          console.log('File deletion warning:', fileError);
        }
      }
      
      await storage.deleteProject(id);
      res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: 'Error deleting project' });
    }
  });

  // Download and user management routes (same as before, but simplified for local storage)
  
  // Get download history
  app.get('/api/downloads/history', isAuthenticated, async (req, res) => {
    try {
      const downloads = await storage.getDownloadsByUserId(req.user!.id);
      res.json(downloads);
    } catch (error) {
      console.error('Error fetching download history:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Record a download
  app.post('/api/downloads', isAuthenticated, async (req, res) => {
    try {
      const { contentItemId } = req.body;
      
      const download = await storage.createDownload({
        userId: req.user!.id,
        contentItemId
      });
      
      res.json(download);
    } catch (error) {
      console.error('Error recording download:', error);
      res.status(500).json({ message: 'Error recording download' });
    }
  });

  // Admin routes
  
  // Get all users (admin only)
  app.get('/api/admin/users', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.user!.id);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get user by ID (admin only)
  app.get('/api/admin/users/:id', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.user!.id);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const { id } = req.params;
      const user = await storage.getUserById(id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Get all projects (admin only)
  app.get('/api/admin/projects', isAuthenticated, async (req, res) => {
    try {
      const currentUser = await storage.getUserById(req.user!.id);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: 'Admin access required' });
      }
      
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Payment and Stripe routes (unchanged from original)
  
  // Create payment intent
  app.post('/api/create-payment-intent', isAuthenticated, async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: 'Stripe not configured' });
      }
      
      const { packageType } = req.body;
      
      let amount: number;
      switch (packageType) {
        case 'additional3Videos':
          amount = 19900; // $199.00
          break;
        case 'allRemainingContent':
          amount = 49900; // $499.00
          break;
        default:
          return res.status(400).json({ message: 'Invalid package type' });
      }
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
        metadata: {
          userId: req.user!.id,
          packageType
        }
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      res.status(500).json({ message: 'Error creating payment intent' });
    }
  });

  // Webhook handler for Stripe
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: 'Stripe not configured' });
      }
      
      const sig = req.headers['stripe-signature'] as string;
      let event;
      
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || '');
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        const { userId, packageType } = paymentIntent.metadata;
        
        // Update user's package status
        const updateData: any = {};
        if (packageType === 'additional3Videos') {
          updateData.hasAdditional3Videos = true;
        } else if (packageType === 'allRemainingContent') {
          updateData.hasAllRemainingContent = true;
        }
        
        await storage.updateUser(userId!, updateData);
        
        // Record the payment
        await storage.createPayment({
          userId: userId!,
          stripePaymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          status: 'completed',
          packageType,
          contentItemId: null
        });
        
        console.log(`Package ${packageType} activated for user ${userId}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handler error:', error);
      res.status(500).json({ message: 'Webhook handler error' });
    }
  });

  // Get user's package access
  app.get('/api/user/packages', isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUserById(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({
        hasAdditional3Videos: user.hasAdditional3Videos || false,
        hasAllRemainingContent: user.hasAllRemainingContent || false,
        freeVideoDownloadsUsed: user.freeVideoDownloadsUsed || 0
      });
    } catch (error) {
      console.error('Error fetching package access:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Serve static files from client/dist
  app.use(express.static('client/dist'));

  // Catch-all handler for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.resolve('client/dist/index.html'));
  });

  const server = createServer(app);
  return server;
}