# Anthropic useChat Native Implementation

## Project Overview
Building a lightweight, native implementation of Vercel's useChat hook that directly interfaces with Anthropic's Messages API, providing immediate access to Claude's latest features including web search, code interpreter, and file system tools.

## 🚀 Getting Started for New Developers

Welcome! This guide will help you understand how this project works and get you up to speed quickly.

### What We've Built So Far
We've created the foundation of an AI chat application that connects directly to Anthropic's Claude API. The current implementation includes:

1. **A Zustand store** (`/store/chat.ts`) - The brain of the application that manages all state
2. **An API route** (`/app/api/chat/route.ts`) - Handles communication with Anthropic's API
3. **A test page** (`/app/test/page.tsx`) - Shows the raw data flow and basic UI
4. **Stream parser** (`/lib/stream-parser.ts`) - Processes streaming responses from the API

### Quick Start
```bash
# Install dependencies
pnpm install

# Set up your environment
cp .env.example .env.local
# Add your Anthropic API key to .env.local: ANTHROPIC_API_KEY=your-key-here

# Run the development server
pnpm dev

# Visit http://localhost:3000/test to see the test interface
```

### How It All Works Together

#### 1. The Zustand Store (The Heart of Everything)
The store in `/store/chat.ts` manages ALL application state:
- **Messages**: Chat history with support for text, thinking blocks, and tool use
- **Threads**: Conversation containers (though we're using single thread for now)
- **Streaming State**: Tracks what's currently happening (thinking, searching, etc.)
- **Tool Calls**: Manages web search results and code execution

Key functions:
- `submitMessage()`: Sends a message to the API and handles the streaming response
- `addMessage()`: Adds a new message to the current thread
- `updateMessage()`: Updates a message as streaming content arrives

#### 2. The API Route (The Bridge)
The route in `/app/api/chat/route.ts` is a thin proxy that:
- Receives messages from the client
- Adds authentication headers
- Forwards requests to Anthropic
- Streams responses back using Server-Sent Events (SSE)

Important features:
- Supports Claude 4 Opus with beta features
- Enables web search and code execution tools
- Handles thinking blocks with proper configuration

#### 3. The Test Page (The Validator)
The page at `/app/test/page.tsx` shows:
- Raw JSON state from Zustand (left side)
- Formatted messages with thinking blocks and search results (right side)
- Input field to send messages
- Real-time updates as responses stream in

### Understanding the Data Flow

1. **User types a message** → Input stored in component state
2. **User hits Enter** → `submitMessage()` called in Zustand store
3. **Store sends POST request** → API route receives the message
4. **API route calls Anthropic** → With proper headers and tool definitions
5. **Anthropic streams response** → API route forwards SSE events
6. **Store processes events** → Updates messages, tool calls, thinking state
7. **React re-renders** → UI shows latest state automatically

### Key Concepts You Need to Know

#### Server-Sent Events (SSE)
We use SSE for streaming because it's:
- Simple to implement
- Works well with Next.js
- Allows real-time updates
- Handles long responses gracefully

#### Anthropic's Content Blocks
Messages contain different types of content:
- **Text blocks**: Regular message text
- **Thinking blocks**: Claude's reasoning process
- **Tool use blocks**: Calls to web search or code execution
- **Tool result blocks**: Results from tool executions

#### Zustand State Management
Why Zustand?
- No providers needed (unlike Context API)
- Simple to use: `const messages = useChatStore(state => state.messages)`
- DevTools support for debugging
- Persists through hot reloads

### Common Tasks

#### Adding a New Feature to the Store
```typescript
// In /store/chat.ts
export const useChatStore = create<ChatStore>()((set, get) => ({
  // Add new state
  myNewFeature: false,
  
  // Add action to update it
  toggleMyFeature: () => set(state => ({ 
    myNewFeature: !state.myNewFeature 
  }))
}))
```

#### Handling a New Event Type from the API
```typescript
// In store's submitMessage function
case 'message_delta':
  if (data.delta.type === 'new_event_type') {
    // Handle your new event
  }
  break;
```

#### Adding UI for New Content Types
```typescript
// In your component
{block.type === 'new_type' && (
  <div className="special-styling">
    {/* Render your new content type */}
  </div>
)}
```

### Debugging Tips

1. **Check the Network tab** - Look for the `/api/chat` request and its streaming response
2. **Watch the JSON state** - The left panel on the test page shows everything
3. **Console logs in the store** - Add logs in `submitMessage()` to track events
4. **Check API errors** - They appear in the `streamError` state

### What's Next?

The immediate next steps are:
1. **Build the useChat hook** - A clean interface for components to use the store
2. **Add proper UI components** - Using shadcn/ui for consistency
3. **Implement file uploads** - Support for images and documents
4. **Add thread management** - Multiple conversations
5. **Persist conversations** - Local storage or database

### Architecture Principles to Follow

1. **Keep the API route thin** - It should only proxy and authenticate
2. **All state in Zustand** - Don't create local component state for shared data
3. **Type everything** - Use Anthropic's SDK types directly
4. **Stream first** - Design for real-time updates, not request/response
5. **Simple over clever** - Readable code beats clever abstractions

### Working with Anthropic Server Tools

Server tools (like web search) work differently from regular tools:

#### Key Differences
1. **Tool Type**: Use `server_tool_use` instead of `tool_use` in content blocks
2. **No Manual Execution**: Anthropic executes these tools automatically
3. **Results Format**: Results come as separate content blocks (`web_search_tool_result`)
4. **Citations**: Web search includes citations via `citations_delta` events

#### Implementation Tips

##### 1. Handle Multiple Content Block Types
```typescript
// In your streaming handler
if (event.type === 'content_block_start') {
  // Handle both regular and server tools
  if (block.type === 'tool_use' || block.type === 'server_tool_use') {
    // Track tool execution
  } else if (block.type === 'web_search_tool_result') {
    // Process search results
  }
}
```

##### 2. Track Content Block Indices
Server tools create multiple content blocks. Use the `index` field:
```typescript
currentBlockIndex = event.index || contentBlocks.length
contentBlocks[currentBlockIndex] = event.content_block
```

##### 3. Handle Citations
Citations link text to sources via `citations_delta` events:
```typescript
if (event.delta.type === 'citations_delta') {
  if (!currentTextBlock.citations) {
    currentTextBlock.citations = []
  }
  currentTextBlock.citations.push(event.delta.citation)
}
```

##### 4. Preserve All Content Blocks
Don't filter content blocks - preserve everything for the full context:
```typescript
// Bad: Only keeping text blocks
const finalContent = contentBlocks.filter(b => b.type === 'text')

// Good: Keep all blocks
const finalContent = contentBlocks.filter(b => b !== undefined)
```

#### Common Server Tools

##### Web Search (`web_search_20250305`)
- Executes searches automatically based on the query
- Returns `web_search_tool_result` blocks with search results
- Includes citations linking text to sources
- Configure with `allowed_domains`, `blocked_domains`, etc.

##### Code Execution (`code_execution_20250522`)
- Runs code in a sandboxed environment
- Returns execution results and output
- Useful for calculations, data processing, etc.

#### Debugging Server Tools

1. **Log all content block types** - You might discover new types
2. **Check the `index` field** - Ensures blocks stay in order
3. **Watch for unknown delta types** - New features may add new deltas
4. **Preserve raw data** - Store the complete content array for debugging

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