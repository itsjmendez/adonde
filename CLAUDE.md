# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Adonde** is a roommate finder web application built with Next.js 15.4.6, using the App Router architecture, TypeScript, and Tailwind CSS v4 with shadcn/ui components. The app helps people find compatible roommates through location-based search, profile matching, and secure messaging.

### Core Features

- **User Authentication**: Email signup/login with verification
- **Profile Management**: Comprehensive profile setup and editing
- **Location-Based Search**: ✅ Find roommates by location with radius settings (COMPLETED)
- **Connection System**: Send/receive connection requests with accept/decline
- **Messaging**: Direct chat for accepted connections
- **Matching Algorithm**: Compatibility based on lifestyle preferences

## Development Commands

- **Start development server**: `npm run dev` (opens at http://localhost:3000)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`

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
- `lib/` - Utility libraries and services
  - `geocoding.ts` - OpenCage API integration with caching
  - `profile.ts` - User profile and roommate search functions
  - `supabase.ts` - Database client configuration
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

## Database Setup Instructions

If working on a new environment, run these SQL files in Supabase:
1. `migration-location-search.sql` - Core schema and functions
2. `fix-geocoding-cache-rls.sql` - RLS policy fixes
3. `test-data.sql` - Sample data for testing

## Next Available Features to Implement

Choose any of these remaining core features:
- **Connection System**: Send/receive/manage roommate connection requests
- **Messaging System**: Real-time chat for accepted connections  
- **Enhanced Matching**: Algorithm-based compatibility scoring
- **Profile Enhancements**: More detailed preferences and lifestyle matching
- **Notification System**: Email/push notifications for connections and messages
