# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 (App Router) application called "4コマメイカー" (4-Koma Maker) that generates 4-panel manga-style comics using Google's Gemini 3 Pro models.

**Architecture**: Fully client-side application
- All data stored in browser's IndexedDB (no backend server)
- Direct communication with Google Gemini API from browser
- Users provide their own Gemini API key
- Complete privacy: no data sent to any server except Gemini API

The app manages Projects, Characters, and Episodes with a hierarchical structure.

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

No environment variables required! The app runs entirely in the browser.

Users configure their own Google Gemini API key through the settings UI, which is stored in their browser's IndexedDB.

## Application Architecture

### Data Hierarchy

```
Project (プロジェクト)
├── Characters (キャラクター)
│   ├── Character images
│   ├── Personality traits
│   └── First-person pronouns
└── Episodes (エピソード)
    ├── Title
    ├── 4-panel story
    └── Generated comic image
```

### Key Components

- `src/app/page.tsx` - Main app with view router (project list, project detail, episode creator)
- `src/components/project-detail.tsx` - Project management, character list, episode list
- `src/components/episode-creator.tsx` - 4-step episode creation workflow
- `src/components/project-create-modal.tsx` - New project creation
- `src/components/settings-modal.tsx` - API key and model configuration
- `src/components/welcome-modal.tsx` - First-time user onboarding

### Core Libraries

**`src/lib/db.ts`** - IndexedDB wrapper for client-side storage:
- Projects, Characters, Episodes, Settings
- All CRUD operations
- Browser-only, no server communication

**`src/lib/client-gemini.ts`** - Google Gemini API client:
- `generateEpisodeStory()` - Text generation for story/characters (JSON output)
- `generateCharacterImage()` - Character reference image generation
- `generateComic()` - Final 4-panel comic generation with layout reference
- `generateAICharacter()` - AI-powered character creation
- Direct browser-to-Gemini API communication

### Type Definitions

`src/types/index.ts`:
- `Project` - Project with name, description, artStyle
- `Character` - Character with name, description, imagePreviewUrl, personality, firstPerson
- `Episode` - Episode with title, panels (4 strings), comicImageUrl, episodeNumber

## Important Implementation Details

### Reference Image System

The final comic generation uses a multi-image input approach:
1. **Base layout**: `public/reference.jpg` provides the 4-panel vertical structure template
2. **Character references**: Generated character images ensure visual consistency

Both are sent as base64 inline data to the Gemini image model. The reference.jpg is fetched client-side in `client-gemini.ts`.

### Gemini Model Configuration

- **Text Model**: `gemini-3-pro-preview` with high thinking level (default), safety thresholds set to BLOCK_ONLY_HIGH
- **Image Model**: `gemini-3-pro-image-preview` for both character refs and final comic
- **Image Generation**: Uses 9:16 aspect ratio (smartphone vertical format) for final comic output
- **Prompt Engineering**: Specific instructions for manga style, vertical panel layout, Japanese dialogue

### State Management

`episode-creator.tsx` uses local useState for 4-step workflow:
- Step 1: Topic input and character selection
- Step 2: Story review and editing (title, 4 panels, characters)
- Step 3: Character image generation/upload
- Step 4: Final comic generation and episode save

`page.tsx` manages view routing between:
- Project list view
- Project detail view (with character/episode management)
- Episode creator view

### IndexedDB Schema

Database: `ComicMakerDB` (version 1)
- `projects` store: Project data
- `characters` store: Character data with projectId index
- `episodes` store: Episode data with projectId index
- `settings` store: Key-value pairs (API key, model preferences)

## Path Alias

TypeScript is configured with `@/*` mapping to `./src/*` for clean imports.

## Styling

Uses Tailwind CSS v4 with dark mode support. The UI includes animations (`animate-in fade-in slide-in-from-bottom-4`) and responsive design (mobile-first with md: breakpoints).
