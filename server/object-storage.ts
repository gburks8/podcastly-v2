import { Client } from "@replit/object-storage";
import fs from "fs/promises";
import path from "path";

// Initialize Replit Object Storage client with error handling
let client: Client | null = null;
let isObjectStorageAvailable = false;

// Lazy initialization to avoid startup errors
async function getClient(): Promise<Client | null> {
  if (client) return client;
  
  try {
    client = new Client();
    // Test the client to see if it works
    await client.list();
    isObjectStorageAvailable = true;
    console.log('✅ Object Storage client initialized successfully');
    return client;
  } catch (error: any) {
    console.log('⚠️  Object Storage not available - using local storage fallback');
    if (error.message?.includes('bucket name')) {
      console.log('📋 To enable Object Storage: Create a bucket in the Object Storage tab of your Replit workspace');
    }
    isObjectStorageAvailable = false;
    return null;
  }
}

export interface UploadResult {
  success: boolean;
  objectKey: string;
  url: string;
  error?: string;
}

/**
 * Upload a file to Replit Object Storage
 * @param filePath Local file path to upload
 * @param objectKey Key to store the object under (e.g., "videos/video-123.mp4")
 * @returns Upload result with object key and URL
 */
export async function uploadFile(filePath: string, objectKey: string): Promise<UploadResult> {
  try {
    const storageClient = await getClient();
    
    if (!storageClient) {
      return {
        success: false,
        objectKey,
        url: '',
        error: 'Object Storage not available - using local storage fallback'
      };
    }
    
    // Read the file as bytes
    const fileData = await fs.readFile(filePath);
    
    // Upload to Object Storage
    const result = await storageClient.uploadFromBytes(objectKey, fileData);
    
    if (!result.ok) {
      throw new Error(`Upload failed: ${result.error?.message || 'Unknown error'}`);
    }
    
    return {
      success: true,
      objectKey,
      url: `/api/files/${objectKey}` // We'll serve files through our API
    };
  } catch (error) {
    console.error('Error uploading file to Object Storage:', error);
    return {
      success: false,
      objectKey,
      url: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Download a file from Object Storage
 * @param objectKey Key of the object to download
 * @returns File data as Buffer or null if not found
 */
export async function downloadFile(objectKey: string): Promise<Buffer | null> {
  try {
    const storageClient = await getClient();
    
    if (!storageClient) {
      return null;
    }
    
    const result = await storageClient.downloadAsBytes(objectKey);
    
    if (!result.ok) {
      console.error('Error downloading file:', result.error?.message);
      return null;
    }
    
    return Buffer.from(result.value as unknown as Uint8Array);
  } catch (error) {
    console.error('Error downloading file from Object Storage:', error);
    return null;
  }
}

/**
 * Check if a file exists in Object Storage
 * @param objectKey Key to check
 * @returns True if file exists, false otherwise
 */
export async function fileExists(objectKey: string): Promise<boolean> {
  try {
    const storageClient = await getClient();
    
    if (!storageClient) {
      return false;
    }
    
    const result = await storageClient.exists(objectKey);
    return result.ok && result.value;
  } catch (error) {
    console.error('Error checking file existence:', error);
    return false;
  }
}

/**
 * Delete a file from Object Storage
 * @param objectKey Key of the file to delete
 * @returns True if deletion was successful
 */
export async function deleteFile(objectKey: string): Promise<boolean> {
  try {
    const storageClient = await getClient();
    
    if (!storageClient) {
      return false;
    }
    
    const result = await storageClient.delete(objectKey);
    return result.ok;
  } catch (error) {
    console.error('Error deleting file from Object Storage:', error);
    return false;
  }
}

/**
 * List files in Object Storage with optional prefix
 * @param prefix Optional prefix to filter files (e.g., "videos/")
 * @returns Array of object keys
 */
export async function listFiles(prefix?: string): Promise<string[]> {
  try {
    const storageClient = await getClient();
    
    if (!storageClient) {
      return [];
    }
    
    const result = await storageClient.list();
    
    if (!result.ok) {
      console.error('Error listing files:', result.error?.message);
      return [];
    }
    
    const files = result.value;
    
    // Extract file names from storage objects
    const fileNames = files.map(file => file.name);
    
    if (prefix) {
      return fileNames.filter(fileName => fileName.startsWith(prefix));
    }
    
    return fileNames;
  } catch (error) {
    console.error('Error listing files from Object Storage:', error);
    return [];
  }
}

/**
 * Check if Object Storage is available
 * @returns True if Object Storage is configured and working
 */
export async function isObjectStorageReady(): Promise<boolean> {
  const storageClient = await getClient();
  return storageClient !== null;
}

/**
 * Generate a unique object key for a file
 * @param originalName Original filename
 * @param type File type (videos, headshots, thumbnails)
 * @returns Unique object key
 */
export function generateObjectKey(originalName: string, type: 'videos' | 'headshots' | 'thumbnails'): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1E9);
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const extension = path.extname(sanitizedName);
  const nameWithoutExt = path.basename(sanitizedName, extension);
  
  return `${type}/${nameWithoutExt}-${timestamp}-${random}${extension}`;
}

/**
 * Migrate a file from local storage to Object Storage
 * @param localPath Local file path
 * @param objectKey Object Storage key
 * @returns Migration result
 */
export async function migrateFileToObjectStorage(localPath: string, objectKey: string): Promise<UploadResult> {
  try {
    // Check if local file exists
    await fs.access(localPath);
    
    // Upload to Object Storage
    const uploadResult = await uploadFile(localPath, objectKey);
    
    if (uploadResult.success) {
      console.log(`Successfully migrated ${localPath} to Object Storage as ${objectKey}`);
    }
    
    return uploadResult;
  } catch (error) {
    console.error(`Error migrating file ${localPath}:`, error);
    return {
      success: false,
      objectKey,
      url: '',
      error: error instanceof Error ? error.message : 'Migration failed'
    };
  }
}