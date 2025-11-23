# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 (App Router) application called "Nano Banana Comic Maker" that generates 4-panel manga-style comics using Google's Gemini 3 Pro models. The app uses a multi-step workflow where users input a topic, review/edit the generated plot, design character reference images, and finally generate a complete comic strip.

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm build

# Start production server
npm start

# Run linter
npm run lint
```

## Environment Setup

Create a `.env.local` file (use `.env.example` as template):
```
NANO_BANANA_API_KEY=your_gemini_api_key_here
```

The app uses Google Generative AI API (Gemini models), which requires a valid API key.

## Application Architecture

### Multi-Step Comic Generation Flow

The app follows a 4-step user journey managed entirely in `src/components/comic-generator.tsx`:

1. **Step 1: Topic & Style** - User inputs comic topic/idea and selects art style
2. **Step 2: Review Plot** - AI generates title, 4 panels, and character definitions; user can edit
3. **Step 3: Design Characters** - User generates and refines character reference images
4. **Step 4: Final Comic** - AI generates the complete 4-panel comic strip

### Key Components

- `src/components/comic-generator.tsx` - Main orchestrator managing all 4 steps and state
- `src/components/character-form.tsx` - Character creation/editing form
- `src/components/comic-display.tsx` - Displays generated comic panels
- `src/app/page.tsx` - Simple wrapper rendering ComicGenerator

### API Route Structure

Single API endpoint at `src/app/api/generate/route.ts` handles three request types:

**Story Generation** (`type: 'story'`)
- Input: `{ topic, styleReference }`
- Uses: `gemini-3-pro-preview` (text model)
- Output: `{ title, panels[], characterDefinitions[] }`

**Character Reference** (`type: 'character'`)
- Input: `{ character: { name, description } }`
- Uses: `gemini-3-pro-image-preview` (image model)
- Output: `{ imageUrl }` (base64 data URL)

**Final Comic** (`type: 'comic'`)
- Input: `{ topic, title, panels[], characters[] }`
- Uses: `gemini-3-pro-image-preview` (image model)
- Includes: Base layout reference (`public/reference.jpg`) + character images
- Output: `{ panels: [{ imageUrl }] }` (single 4-panel vertical strip)

### Core Library

`src/lib/nano-banana-client.ts` - Wrapper around Google Generative AI SDK:

- `generateStory()` - Text generation for plot/characters (outputs JSON)
- `generateCharacterReference()` - Single character image generation
- `generateFullComic()` - Final multi-panel comic with reference images
- `generateComicPanel()` - Helper for single panel generation

### Type Definitions

`src/types/index.ts`:
- `Character` - Character data with id, name, description, imagePreviewUrl
- `ComicPanel` - Panel data with id, imageUrl, prompt
- `GenerationRequest` - Request shape for comic generation

## Important Implementation Details

### Reference Image System

The final comic generation uses a multi-image input approach:
1. **Base layout**: `public/reference.jpg` provides the 4-panel vertical structure template
2. **Character references**: Generated character images ensure visual consistency

Both are sent as base64 inline data to the Gemini image model in `generateFullComic()`.

### Gemini Model Configuration

- **Text Model**: `gemini-3-pro-preview` with high thinking level (default), safety thresholds set to BLOCK_ONLY_HIGH
- **Image Model**: `gemini-3-pro-image-preview` for both character refs and final comic
- **Image Generation**: Uses 9:16 aspect ratio (smartphone vertical format) for final comic output
- **Prompt Engineering**: Specific instructions for manga style, vertical panel layout, Japanese dialogue

### State Management

`comic-generator.tsx` uses local useState for:
- `currentStep` (1-4)
- `topic`, `title`, `panels[]` - Story content
- `selectedStyle` - Art style choice
- `characters[]` - Character definitions with images (dynamic count based on story)
- `comicImage` - Final generated comic
- `isGenerating` - Loading state

### File Reading in API Route

The API route uses Node.js `fs` module to read `public/reference.jpg` server-side and convert to base64. This is a server-side operation only (src/app/api/generate/route.ts:52-64).

## Path Alias

TypeScript is configured with `@/*` mapping to `./src/*` for clean imports.

## Styling

Uses Tailwind CSS v4 with dark mode support. The UI includes animations (`animate-in fade-in slide-in-from-bottom-4`) and responsive design (mobile-first with md: breakpoints).
