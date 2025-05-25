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
import type { Message, ContentBlock } from '@anthropic-ai/sdk';
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

## Next Steps
1. Set up basic Next.js project structure
2. Create minimal API route for Anthropic proxy
3. Implement basic Zustand store
4. Build simple useChat hook
5. Test with basic message streaming