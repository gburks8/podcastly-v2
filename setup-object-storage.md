# Setting Up Replit Object Storage

## Step 1: Create Object Storage Bucket

1. **Open the Object Storage tab** in your Replit workspace (left sidebar)
2. **Click "Create Bucket"** - this will create a unique bucket for your project
3. **Note the bucket ID** that gets generated
4. **Install the Object Storage client** by clicking "Install package" in the Commands section

## Step 2: Verify Setup

Once the bucket is created, you can verify it works by:

1. **Upload a test file** through the Object Storage interface
2. **List files** to confirm the bucket is working
3. **Download the test file** to verify read access

## Current Implementation

I've created a hybrid system that:

1. **Uses Object Storage for new uploads** (once bucket is configured)
2. **Serves existing files from local uploads** (backward compatibility)
3. **Provides migration tools** to move existing files to Object Storage

## Benefits

- **Persistent storage** - Files survive deployments
- **Reduced deployment size** - Large files excluded from deployment
- **Better performance** - Object Storage handles large files efficiently
- **Scalability** - No local storage limits

## Migration Process

After setting up the bucket:

1. New uploads automatically go to Object Storage
2. Existing files remain accessible from local storage
3. Optional: Use migration script to move existing files to Object Storage

## File Serving

The application serves files from both locations:
- `/api/files/*` - Object Storage files (new uploads)
- `/uploads/*` - Local files (existing uploads)

This ensures no disruption to existing content while enabling persistent storage for new uploads.