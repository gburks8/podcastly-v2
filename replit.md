# MediaPro - Professional Content Platform

## Overview

MediaPro is a full-stack web application designed for real estate agents to access and download professional content including video podcasts and headshots. The platform features both free and premium content tiers, with Stripe payment integration for premium access.

## User Preferences

Preferred communication style: Simple, everyday language.

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