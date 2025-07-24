/**
 * Type declarations for vite-shim.js
 */

import type { Express } from 'express';
import type { Server } from 'http';

export declare function setupVite(app: Express, server: Server): Promise<void>;