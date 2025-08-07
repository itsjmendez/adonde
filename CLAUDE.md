# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Adonde** is a roommate finder web application built with Next.js 15.4.6, using the App Router architecture, TypeScript, and Tailwind CSS v4 with shadcn/ui components. The app helps people find compatible roommates through location-based search, profile matching, and secure messaging.

### Core Features
- **User Authentication**: Email signup/login with verification
- **Profile Management**: Comprehensive profile setup and editing
- **Location-Based Search**: Find roommates by location with radius settings  
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
  - `ui/` - shadcn/ui components (button, etc.)
  - `navigation.tsx` - Main app navigation component
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
- **Tailwind CSS v4** using `@import "tailwindcss"` syntax
- **shadcn/ui** component library with utilities:
  - `class-variance-authority` for component variants
  - `clsx` and `tailwind-merge` for class name handling
  - `lucide-react` for icons
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