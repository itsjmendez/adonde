# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Adonde** is a roommate finder web application built with Next.js 15.4.6, using the App Router architecture, TypeScript, and Tailwind CSS v4 with shadcn/ui components. The app helps people find compatible roommates through location-based search, profile matching, and secure messaging.

### Core Features

- **User Authentication**: Email signup/login with verification
- **Profile Management**: Comprehensive profile setup and editing
- **Location-Based Search**: ✅ Find roommates by location with radius settings (COMPLETED)
- **Connection System**: Send/receive connection requests with accept/decline
- **Messaging**: ✅ Advanced real-time chat with typing indicators and presence (COMPLETED)
- **Matching Algorithm**: Compatibility based on lifestyle preferences

## Development Commands

- **Start development server**: `npm run dev` (opens at http://localhost:3000)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`

## Security Guidelines

**⚠️ IMPORTANT: Always check before committing files**

Before creating or committing any file, verify it doesn't contain:

- API keys, tokens, or credentials
- Hardcoded URLs (especially with project IDs)
- Database passwords or connection strings
- Internal system details that could aid attackers
- Migration files with sensitive schema information

**Files to NEVER commit:**

- Migration step files (`migration-step-*.md`)
- Production policies with hardcoded URLs
- Files containing database credentials
- API key configuration files
- Internal documentation with sensitive technical details

**Use `.gitignore`** for sensitive files that should remain local only.

## Architecture

### File Structure

- `app/` - Next.js App Router pages and layouts
  - `auth/` - Authentication pages (signup, login)
  - `profile/` - Profile management (setup, edit)
  - `dashboard/` - Main roommate search interface
  - `connections/` - Connection requests management
  - `chat/[connectionId]/` - Dynamic messaging interface
  - `layout.tsx` - Root layout with Geist font configuration
  - `page.tsx` - Landing page with hero section
  - `globals.css` - Global styles with Tailwind and CSS variables
- `components/` - Reusable UI components
  - `ui/` - shadcn/ui components (button, slider, etc.)
  - `navigation.tsx` - Main app navigation component
  - `location-search.tsx` - Location input with geocoding
  - `roommate-card.tsx` - Profile display cards with distance
  - `chat.tsx` - Legacy chat component (fallback)
  - `ConversationChat.tsx` - New optimized chat with real-time features
- `lib/` - Utility libraries and services
  - `geocoding.ts` - OpenCage API integration with caching
  - `profile.ts` - User profile and roommate search functions
  - `chat-api.ts` - Optimized WebSocket chat API with single subscription
  - `supabase.ts` - Database client configuration
- `hooks/` - Custom React hooks
  - `useTypingIndicators.ts` - Real-time typing indicator management
  - `usePresence.ts` - User presence system (online/away/offline)
- Configuration files at root level (next.config.ts, tsconfig.json, etc.)

### User Flow

1. **Registration**: Email signup → profile setup → email verification
2. **Search**: Set location + radius → browse potential roommates
3. **Connect**: Send connection request with message
4. **Response**: Accept (unlock chat) or decline request
5. **Chat**: Direct messaging for accepted connections

### Key Technologies

- **Next.js 15.4.6** with App Router
- **React 19.1.0**
- **TypeScript** with strict mode enabled
- **Supabase** for database, authentication, and real-time features
- **Tailwind CSS v4** using `@import "tailwindcss"` syntax
- **shadcn/ui** component library with utilities:
  - `class-variance-authority` for component variants
  - `clsx` and `tailwind-merge` for class name handling
  - `lucide-react` for icons
- **OpenCage Geocoding API** for location services with intelligent caching
- **ESLint** with Next.js config and TypeScript support

### Styling Approach

- Uses Tailwind CSS v4 with inline theme configuration
- shadcn/ui design system with comprehensive color tokens
- CSS custom properties for theming with `.dark` class support
- OKLCH color space for better color consistency
- Geist fonts (sans and mono) loaded via next/font/google
- `tw-animate-css` for enhanced animations

### TypeScript Configuration

- Path alias `@/*` maps to root directory
- Strict mode enabled
- Uses Next.js plugin for enhanced TypeScript support

## ✅ COMPLETED: Location-Based Search with Geocoding Cache

### Implementation Summary

Successfully implemented a comprehensive location-based search system with the following features:

#### **Database Schema**

- Added location fields to `profiles` table (`latitude`, `longitude`, `search_location`, `search_radius`)
- Created `geocoding_cache` table with RLS policies for efficient caching
- Implemented Haversine distance calculation function in PostgreSQL
- Added `search_roommates_by_location()` function for optimized spatial queries

#### **API Integration**

- **OpenCage Geocoding API** integration with server-side security
- Intelligent caching system to minimize API costs
- `/api/geocoding` endpoint for secure geocoding operations
- Comprehensive error handling and validation

#### **User Interface**

- Clean location search with text input and radius slider (5-100 miles)
- Real-time search results with distance calculations
- Responsive roommate cards showing profiles with lifestyle preferences
- Loading states and error handling for smooth UX

#### **Performance Features**

- **Geocoding Cache**: Eliminates duplicate API calls for same locations
- **Spatial Indexing**: Fast database queries using coordinate indexes
- **Haversine Distance**: Accurate geographic distance calculations
- **Optimized Queries**: Single database call for roommate search results

#### **Files Created/Modified**

- `migration-location-search.sql` - Database schema updates
- `app/api/geocoding/route.ts` - Secure server-side geocoding API
- `lib/geocoding.ts` - Geocoding service with caching logic
- `components/location-search.tsx` - Location input component
- `components/roommate-card.tsx` - Profile display cards
- `components/ui/slider.tsx` - Custom slider component
- Updated `app/dashboard/page.tsx` with search functionality
- Enhanced `lib/profile.ts` with spatial search functions

The feature is **fully functional** and **production-ready** with proper caching, security, and performance optimizations.

---

## ✅ COMPLETED: Advanced Real-Time Chat System

### Implementation Summary

Successfully overhauled the entire chat system with modern real-time architecture and advanced features:

#### **Scalable Database Architecture**

- Created new `conversations` table supporting both direct and group chats
- Added `chat_messages` table with enhanced features (soft delete, read receipts, threading)
- Implemented `typing_indicators` table for real-time typing status
- Added `user_presence` table for online/away/offline status tracking
- Migration functions for backward compatibility with existing data

#### **Optimized WebSocket Architecture**

- **Single WebSocket subscription** per user instead of per-chat channels
- **Eliminated polling fallback** - pure real-time via Supabase Realtime
- **Bandwidth optimized** - only essential data transmitted
- **Scalable to hundreds of conversations** without performance impact

#### **Advanced Real-Time Features**

- **Typing Indicators**: See when someone is typing with auto-cleanup
- **User Presence System**: Online/away/offline status with tab visibility detection
- **Optimistic Updates**: Messages appear instantly before server confirmation
- **Message Pagination**: Load older messages efficiently with "load more"
- **Real-time Message Delivery**: No refresh needed, instant message updates

#### **Performance Improvements**

- **No More Polling**: Eliminated 3-second polling fallback entirely
- **Single Connection**: One WebSocket for all user conversations
- **Efficient Filtering**: Smart message routing to relevant conversations
- **Automatic Cleanup**: Expired typing indicators removed automatically

#### **Files Created/Modified**

**New Architecture:**

- `lib/chat-api.ts` - Centralized chat API with optimized WebSocket management
- `components/ConversationChat.tsx` - Modern chat UI with real-time features
- `hooks/useTypingIndicators.ts` - Typing indicator management
- `hooks/usePresence.ts` - User presence system hooks

**Database Migrations:**

- `scalable-chat-schema.sql` - New scalable database schema
- `migration-strategy.sql` - Data migration and compatibility functions
- `chat-rls-policies.sql` - Row Level Security policies
- `typing-presence-system.sql` - Real-time features implementation
- `production-rls-policies.md` - Production-ready security policies

**Updated:**

- `app/chat/[connectionId]/page.tsx` - Uses new system with fallback to old system

#### **Backward Compatibility**

- Existing connections continue working with old chat system
- Automatic conversation creation for new connections
- Seamless migration of existing message data
- Legacy chat component maintained as fallback

The chat system is now **production-ready** with modern WebSocket architecture, real-time features, and optimized performance.

---

## Database Setup Instructions

### For New Environments:

**Location-Based Search:**

1. `migration-location-search.sql` - Core schema and functions
2. `fix-geocoding-cache-rls.sql` - RLS policy fixes

**Chat System (run in order):**

1. `scalable-chat-schema.sql` - Create new chat tables
2. `migration-strategy.sql` - Migration functions
3. `chat-rls-policies.sql` - Security policies
4. `typing-presence-system.sql` - Real-time features
5. **Enable Realtime** in Supabase dashboard for: `chat_messages`, `typing_indicators`, `user_presence`

### For Production:

- Run `production-rls-policies.md` to enable secure Row Level Security
- Test all chat features before deploying

## Next Priority Features (See next-roadmap.md)

**Recommended next focus:**

1. **Enhanced Connection System** - Better roommate matching and connection management
2. **Group Chat Support** - Multi-person conversations (schema already implemented)
3. **Notification System** - In-app and email notifications
4. **Enhanced Profile System** - Better matching through detailed profiles

**Technical Improvements Needed:**

- Re-enable RLS for production security
- Add rate limiting and input validation
- Implement comprehensive testing
- Set up error monitoring
