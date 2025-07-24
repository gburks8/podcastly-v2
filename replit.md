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
- Completely redesigned user dashboard to show project-based view instead of individual content
- Created dedicated project detail page with tabbed video/headshot views and download functionality
- Implemented project card navigation: Dashboard shows projects → Click project → View deliverables
- Added project statistics and clean project-based user workflow
- Streamlined workflow: Admin can now click user → create project → drag/drop files → upload content
- **Implemented project naming during upload**: Added project name input field in upload dialog
- **Enhanced upload workflow**: Project is now created first with custom name, then all content is associated
- **Fixed project persistence**: Project names now persist across page navigation using database storage
- **Improved user experience**: Admins can name projects at the onset of upload instead of post-upload editing
- **Added project reassignment functionality**: Admins can now transfer project ownership between users
- **Built comprehensive reassignment interface**: Created ProjectReassignDialog with user selection and confirmation
- **Implemented backend reassignment logic**: Projects and all associated content transfer to new users
- **Fixed project creation ID generation**: Resolved database constraint errors during project creation
- **Enhanced admin project management**: Added reassignment button visible only to admin users in project detail view
- **Added clickable project cards in admin interface**: Project cards now clickable to open reassignment dialog
- **Built admin project reassignment workflow**: Click any project → select new user → confirm transfer
- **Enhanced UX with visual feedback**: Hover effects and cursor changes indicate clickable project cards
- **Integrated reassignment from Content Management tab**: Streamlined admin workflow for project ownership changes
- **Built comprehensive project management dialog**: Click project cards to access full management interface with tabbed views
- **Added project name editing**: Inline editing with save/cancel functionality and keyboard shortcuts (Enter/Escape)
- **Implemented content grid with proper thumbnail display**: Video thumbnails maintain vertical aspect ratios, clickable to view content
- **Added content deletion from projects**: Remove individual videos/headshots from projects with confirmation
- **Enhanced video thumbnail layout**: Responsive grid layout preserving original video orientations (vertical videos display vertically)
- **Added click-to-view functionality**: Thumbnails are clickable to open content files in new tabs with hover preview effects
- **Implemented project link sharing**: Added "Copy Link" button to generate shareable URLs for client project access
- **Enhanced admin workflow**: Admins can now easily share project links directly with clients from the management interface
- **Fixed project link authentication flow**: Users who click project links are now properly redirected to the intended project after login
- **Improved user experience**: Preserved destination URLs during authentication prevents users from losing their intended page
- **Resolved critical routing conflicts**: Replaced Wouter Switch with manual routing to prevent multiple routes from matching simultaneously
- **Fixed shareable project links**: Project URLs now work correctly without being overridden by catch-all dashboard redirects
- **Corrected Copy Link functionality**: Fixed admin "Copy Link" to generate direct project URLs instead of auth redirect URLs
- **Verified project routing works**: Direct project links successfully load project pages with full content and functionality
- **Fixed dashboard navigation issues**: Replaced Wouter setLocation with window.location.href for reliable route changes
- **Resolved admin panel button**: Admin panel button now properly navigates to admin interface
- **Fixed user profile navigation**: Made user names clickable in admin Users tab to navigate to individual user profiles
- **Enhanced admin workflow**: Admins can now click user names to access user-specific project creation and management
- **Fixed package purchase navigation**: Connected "Click to Purchase" buttons in FirstDownloadInfoModal to ProjectPricingModal
- **Resolved purchase flow issue**: Package options now properly open the package selection interface
- **Fixed Add Content button**: Added onClick handler to navigate to user profile for content upload
- **Enhanced admin workflow**: Add Content button now properly redirects to user-specific upload interface
- **Fixed critical UserProfile component error**: Resolved "Cannot read properties of undefined" errors in user profile pages
- **Added null safety checks**: Protected all video and headshot array accesses with proper fallback values
- **Restored user profile navigation**: User profile pages now load correctly without JavaScript errors
- **Fixed headshot thumbnail display across all interfaces**: Resolved placeholder icon issue by implementing fallback logic
- **Enhanced image display in ContentCard component**: Added support for using fileUrl when thumbnailUrl is empty for headshots
- **Implemented Sharp library integration**: Added server-side image dimension extraction for proper aspect ratio preservation
- **Redesigned project overview interface**: Removed cluttered "Recent Uploads" section in favor of clean statistics-focused cards
- **Added interactive overview cards**: Made Videos and Headshots statistics cards clickable to navigate to detailed content views
- **Enhanced project management UX**: Created comprehensive Project Information section with client details and creation dates

**July 22, 2025**
- **Fixed payment-to-access automation system**: Resolved critical access control issues preventing paid customers from downloading content
- **Updated download endpoint access logic**: Backend now checks both free selections AND package purchases for download permissions
- **Fixed frontend package access queries**: Resolved TypeScript errors and implemented proper package access checking
- **Corrected FirstDownloadInfoModal behavior**: Modal now only appears when users need to make access decisions, not after they've already paid
- **Implemented proper modal triggering logic**: Fixed ContentCard to show FirstDownloadInfoModal when users click "Download Free Video" for first time
- **Completed end-to-end payment workflow**: Users now get instant access to content after successful payment via Stripe webhooks
- **Verified automated access control**: System properly grants access based on package purchases without requiring manual intervention
- **Fixed shareable project links for public access**: Modified project access routes to allow unauthenticated users to view shared project links
- **Enhanced public project viewing**: Removed authentication requirements from project viewing routes while maintaining security for downloads and actions
- **Resolved "Access denied" errors**: Fixed 403 errors when copying project links and accessing them in incognito/unauthenticated browsers
- **Implemented proper public-private access separation**: Users can now view shared projects publicly but must authenticate for downloads and interactions

**July 24, 2025**
- **Added client delivery email template system**: Implemented "Delivery" button in project management interface that generates professional email templates
- **Created comprehensive email template generator**: Generates personalized emails with project details, login instructions, and access guidelines for client onboarding
- **Built EmailTemplateModal component**: Professional interface for copying email templates directly to clipboard for manual sending via Gmail
- **Enhanced admin workflow for client communication**: Admins can now easily generate and send login instructions to clients with project access links
- **Solved client onboarding confusion**: Clear email templates explain how clients access accounts that admins have already created for them
- **Implemented one-click email template copying**: Copy-to-clipboard functionality with fallback support for all browsers
- **RESOLVED DEPLOYMENT SIZE ISSUE**: Identified 7.4GB of uploaded videos as main cause of deployment failure (exceeded 8GB limit)
- **Created comprehensive deployment optimization**: Built .replitignore, deployment scripts, and size reduction tools
- **Excluded uploads directory from deployment**: Updated .replitignore to exclude uploads/ and .git/ directories, reducing deployment from 10GB to 696MB
- **Implemented Replit Object Storage integration**: Created hybrid storage system supporting both local files and persistent Object Storage
- **Built Object Storage utilities**: Comprehensive upload/download system with error handling and fallback to local storage
- **Added storage status monitoring**: Created API endpoint to check Object Storage availability and provide setup guidance
- **Documented production storage strategy**: Created deployment guides explaining Object Storage setup and migration process

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