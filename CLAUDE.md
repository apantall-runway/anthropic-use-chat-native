# Anthropic useChat Native Implementation

## Project Overview
Building a lightweight, native implementation of Vercel's useChat hook that directly interfaces with Anthropic's Messages API, providing immediate access to Claude's latest features including web search, code interpreter, and file system tools.

## Core Philosophy
- **Simplicity First**: Keep everything as simple as possible
- **One Thing at a Time**: Build incrementally, test each piece
- **API-First**: Match Anthropic's API structure closely
- **Centralized State**: All state (UI and data) lives in Zustand

## Technical Stack
- **Next.js**: API routes for proxying to Anthropic
- **Zustand**: Centralized state management
- **TypeScript**: Using Anthropic SDK types directly
- **React**: Custom hooks for UI integration

## Architecture Decisions

### State Management (Zustand)
All state lives in one place, including:
- **UI State**: Sidebar open/closed, active modals, selected views
- **Data State**: Threads, messages, artifacts, documents
- **Streaming State**: Active tool calls, thinking status
- **Input State**: Message input, attachments

Benefits:
- No prop drilling
- Simple component logic (just read state and dispatch)
- Easy to debug and track state changes
- UI becomes purely reactive to state

### API Structure
Keep Next.js routes thin - just proxy and auth:
```typescript
// /api/anthropic/messages
// Simply proxy to Anthropic, handle auth, return streams
```

### Type Safety
Use Anthropic SDK types directly:
```typescript
import type { Message, ContentBlock } from '@anthropic-ai/sdk'
```

## Development Process

### Plan → Build → Check
1. **Plan**: Document what we're building in plain English
2. **Build**: Implement one small piece
3. **Check**: Verify it works and remains simple

### Roadmap Tracking
Maintain clear documentation of:
- Current work
- Next steps
- Explicitly rejected features (and why)

### Feature Progression
1. Basic message streaming through Next.js route
2. Zustand store with message state
3. useChat hook with basic functionality
4. Tool use parsing and display
5. Parallel tool calls and thinking blocks
6. UI state management
7. Thread management
8. Artifacts and documents

## Key Features to Implement

### Core Messaging
- Streaming text responses
- Message history
- Error handling
- Loading states

### Tool Use
- Parse tool calls from stream
- Display tool status (pending/running/complete)
- Render tool results appropriately
- Support parallel tool execution

### Extended Features
- Thinking blocks with proper display
- File attachments
- Web search results
- Code interpreter outputs
- Custom tool result rendering

## What We're NOT Building (Yet)
- Authentication system (beyond basic API key)
- Message persistence/database
- Multi-user support
- Complex routing
- Unnecessary abstractions

## Success Metrics
- Can stream messages from Anthropic? ✓
- Can handle tool use? ✓
- Stays simple and maintainable? ✓
- Easy to extend? ✓

## Styling System (Based on Vercel Chat Template)

### Core Dependencies
- **Tailwind CSS v4**: Already installed with Next.js
- **shadcn/ui**: Component library built on Radix UI
- **Radix UI**: Unstyled, accessible component primitives
- **Geist Font**: Vercel's font system
- **tailwind-merge**: For merging Tailwind classes safely
- **clsx**: For conditional classes
- **class-variance-authority (cva)**: For component variants

### Color System
- Base color: **Zinc** (neutral gray)
- HSL-based CSS variables for easy theming
- Support for light/dark modes from the start
- Semantic color tokens (foreground, background, border, etc.)

### File Structure
```
/app/globals.css          - CSS variables, base styles
/lib/utils.ts            - cn() utility for class merging
/components/ui/*         - shadcn/ui components
/tailwind.config.ts      - Extended with animations, typography
```

### Implementation Order
1. **Install core dependencies**
   - shadcn/ui CLI
   - Geist font
   - Supporting utilities (clsx, tailwind-merge, cva)

2. **Configure shadcn/ui**
   - Initialize with zinc color scheme
   - Set up components.json
   - Configure path aliases

3. **Set up base styles**
   - CSS variables for theming
   - Geist font configuration
   - Dark mode support

4. **Extend Tailwind config**
   - Add tailwindcss-animate
   - Configure typography plugin
   - Custom animations

5. **Create utilities**
   - cn() function for class merging
   - Common style utilities

6. **Install base components**
   - Button, Card, Input
   - Skeleton (for loading states)
   - ScrollArea (for chat interface)

## Next Steps (Revised - API First)
1. Set up basic Next.js project structure ✓
2. Install Anthropic SDK and Zustand ✓
3. Create Zustand store matching Anthropic's API types ✓
4. Create minimal API route for Anthropic proxy ✓
5. Build simple useChat hook connected to store
6. Create testing page that:
   - Shows raw JSON state from Zustand ✓
   - Has a simple input to send messages ✓
   - Displays streaming responses as they come ✓
7. Test with basic message streaming ✓
8. THEN implement proper UI/styling system based on actual data