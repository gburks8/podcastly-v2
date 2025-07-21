# MediaPro - Professional Content Platform

## Overview

MediaPro is a full-stack web application designed for real estate agents to access and download professional content including video podcasts and headshots. The platform features both free and premium content tiers, with Stripe payment integration for premium access.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**July 21, 2025**
- Implemented user profile gallery system with project-based organization
- Added clickable user navigation from admin Users tab
- Created UserProfile page showing content organized into projects (batches of 12 items)
- Added drill-down functionality to view individual videos and headshots within projects
- Enhanced admin interface with hover effects and navigation to user profiles
- Added server endpoints for fetching individual user data and user-specific content
- Implemented project-based content grouping for better client content management
- Added "Create New Project" functionality directly from user profile page
- Built comprehensive upload interface with file selection, metadata editing, and batch processing
- Implemented upload queue system with progress tracking and error handling
- Added drag and drop file upload with visual feedback and file type validation
- Enhanced UX with intuitive upload zone supporting both drag & drop and browse methods
- Added overall progress bar showing total upload progress across all files
- Implemented inline project name editing with hover-to-reveal edit functionality
- Added keyboard shortcuts (Enter to save, Escape to cancel) for project name editing
- Fixed video thumbnail display to preserve original aspect ratios (vertical videos show vertically)
- Enhanced thumbnail layout with flexible grid and proper centering for all video orientations
- Streamlined workflow: Admin can now click user → create project → drag/drop files → upload content

**July 18, 2025**
- Added user account selection feature for admin content uploads
- Fixed broken profile images in admin Users section using Avatar components
- Added validation to ensure user selection before file upload
- Enhanced upload interface with user dropdown showing profile pictures and names
- Updated upload queue structure to include target user ID for content assignment

**July 17, 2025**
- Implemented tiered pricing system with package-based purchases
- Added new package options: "Additional 3 Videos" ($199) and "All Remaining Content" ($499)
- Updated database schema with package tracking fields (hasAdditional3Videos, hasAllRemainingContent)
- Created PackagePurchaseModal component with elegant package selection UI
- Added package purchase API endpoints and payment processing
- Updated access control logic to handle package-based content access
- Enhanced dashboard to show package purchase option after free selections
- Replaced individual content purchases with strategic package offerings
- Added comprehensive explanatory text at top of dashboard to guide users through process
- Removed free headshot option - now only 3 free videos, headshots available in $499 package only

**July 16, 2025**
- Fixed video thumbnail generation to preserve actual video aspect ratios
- Completely redesigned FFmpeg thumbnail generation system for vertical videos
- For vertical videos (1080x1920), thumbnails now generate at proper 180x320 dimensions
- Updated ContentCard component to display thumbnails naturally without CSS distortion
- Simplified container styling to properly center vertical thumbnails
- Removed forced aspect-ratio CSS constraints that were causing display issues
- Improved download button progression: "Download Free Video" → "Confirm Download" → "Download Video"
- Added tracking for previously downloaded content to show appropriate button text
- Fixed database schema by adding missing content_item_id column to payments table
- Added /api/content/:id/details endpoint for purchase page content viewing

**July 15, 2025**
- Replaced Replit Auth with custom email/password authentication system
- Added password hashing using Node.js scrypt for security
- Updated database schema to support custom user accounts
- Fixed authentication loops and loading screen issues
- Created admin account: grantburks@optikoproductions.com (Admin123)
- Added is_admin column to users table for role-based access

## System Architecture

The application follows a modern full-stack architecture with a clear separation between client and server:

### Frontend Architecture
- **Framework**: React with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: TanStack Query for server state management
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **File Handling**: Multer for file uploads with local storage

## Key Components

### Database Schema
The application uses PostgreSQL with the following core entities:
- **Users**: Profile information, premium status, Stripe customer ID
- **Content Items**: Videos and headshots with metadata (title, description, type, category)
- **Payments**: Stripe payment tracking and status
- **Downloads**: User download history and access tracking
- **Sessions**: Secure session storage for authentication

### Authentication System
- Replit Auth integration for seamless authentication
- Session-based authentication with PostgreSQL storage
- User profile management with premium status tracking
- Automatic user creation and updates on login

### Content Management
- Free and premium content categorization
- File upload system with metadata storage
- Download access control based on user premium status
- Admin interface for content management

### Payment Processing
- Stripe integration for premium content purchases
- Payment intent creation and confirmation
- Automatic premium status updates on successful payments
- Payment history tracking

## Data Flow

1. **User Authentication**: Users authenticate via Replit Auth, creating or updating their profile
2. **Content Access**: Authenticated users can view free content immediately
3. **Premium Purchase**: Users can purchase premium access through Stripe
4. **Content Download**: Users with appropriate access can download content files
5. **Admin Management**: Admin users can upload and manage content through dedicated interface

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection for serverless environments
- **drizzle-orm**: Type-safe database operations and migrations
- **@stripe/stripe-js & @stripe/react-stripe-js**: Payment processing
- **openid-client**: Authentication with Replit Auth
- **multer**: File upload handling
- **express-session & connect-pg-simple**: Session management

### UI Dependencies
- **@radix-ui/***: Accessible UI component primitives
- **@tanstack/react-query**: Server state management
- **react-hook-form & @hookform/resolvers**: Form handling
- **tailwindcss**: Utility-first CSS framework
- **wouter**: Lightweight routing

## Deployment Strategy

### Development Environment
- Vite development server with HMR
- Express server with TypeScript compilation via tsx
- Automatic database schema synchronization
- Replit-specific development tooling integration

### Production Build
- Vite builds optimized client assets to `dist/public`
- esbuild bundles server code for Node.js execution
- Environment variables for database and API keys
- PostgreSQL database with connection pooling

### Environment Configuration
Required environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key (client-side)
- `SESSION_SECRET`: Session encryption secret
- `REPLIT_DOMAINS`: Allowed domains for Replit Auth
- `ISSUER_URL`: OpenID Connect issuer URL

The application is designed to run on Replit's infrastructure with automatic provisioning of PostgreSQL databases and seamless authentication integration.