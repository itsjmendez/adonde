# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.4.6 application using the App Router architecture, TypeScript, and Tailwind CSS v4. The project follows the standard Next.js App Router structure with the main application code in the `app/` directory.

## Development Commands

- **Start development server**: `npm run dev` (opens at http://localhost:3000)
- **Build for production**: `npm run build`
- **Start production server**: `npm start`
- **Lint code**: `npm run lint`

## Architecture

### File Structure
- `app/` - Next.js App Router pages and layouts
  - `layout.tsx` - Root layout with Geist font configuration
  - `page.tsx` - Home page component
  - `globals.css` - Global styles with Tailwind and CSS variables
- Configuration files at root level (next.config.ts, tsconfig.json, etc.)

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