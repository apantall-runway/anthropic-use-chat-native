import { create } from 'zustand'
import type { Message, ContentBlock } from '@anthropic-ai/sdk'

// Tool types
interface WebSearchTool {
  type: 'web_search_20250305'
  name: 'web_search'
  max_uses?: number
  allowed_domains?: string[]
  blocked_domains?: string[]
}

interface CodeExecutionTool {
  type: 'code_execution_20250522'
  name: 'code_execution'
}

// Thread type (not from Anthropic SDK, but useful for organization)
interface Thread {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
}

// Attachment type for file uploads
interface Attachment {
  id: string
  name: string
  type: string
  size: number
  content?: string
}

// Artifact type for code/documents that Claude generates
interface Artifact {
  id: string
  type: 'code' | 'document' | 'image'
  title: string
  content: string
  language?: string
  createdAt: Date
}

// Document type for reference materials
interface Document {
  id: string
  title: string
  content: string
  type: string
  createdAt: Date
}

// Tool call status tracking
interface ToolCallStatus {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: Date
  completedAt?: Date
  error?: string
  result?: any
}

// Search result type
interface SearchResult {
  title: string
  url: string
  snippet: string
  timestamp?: string
}

// Main store interface
interface ChatStore {
  // UI State
  sidebarOpen: boolean
  activeModal: 'settings' | 'newThread' | null
  selectedView: 'chat' | 'artifacts' | 'documents'
  
  // Thread Management
  threads: Thread[]
  selectedThreadId: string | null
  
  // Messages (for current thread)
  messages: Message[]
  selectedMessageId: string | null
  streamingMessage: Partial<Message> | null
  
  // Input State
  messageInput: string
  attachments: Attachment[]
  
  // Artifacts/Documents
  artifacts: Artifact[]
  selectedArtifactId: string | null
  documents: Document[]
  
  // Active Operations
  activeToolCalls: Map<string, ToolCallStatus>
  isThinking: boolean
  isStreaming: boolean
  currentThinkingContent: string
  searchResults: SearchResult[]
  
  // UI Actions
  toggleSidebar: () => void
  setActiveModal: (modal: 'settings' | 'newThread' | null) => void
  setSelectedView: (view: 'chat' | 'artifacts' | 'documents') => void
  
  // Thread Actions
  createThread: (title?: string) => string
  selectThread: (threadId: string | null) => void
  deleteThread: (threadId: string) => void
  
  // Message Actions
  setMessageInput: (input: string) => void
  clearMessageInput: () => void
  addMessage: (message: Message) => void
  updateStreamingMessage: (content: Partial<Message>) => void
  finalizeStreamingMessage: (message: Message) => void
  
  // Attachment Actions
  addAttachment: (attachment: Attachment) => void
  removeAttachment: (attachmentId: string) => void
  clearAttachments: () => void
  
  // Tool Call Actions
  startToolCall: (id: string, name: string) => void
  completeToolCall: (id: string, error?: string) => void
  updateToolCallResult: (id: string, result: any) => void
  
  // Thinking Actions
  updateThinkingContent: (content: string) => void
  clearThinking: () => void
  
  // Search Actions
  addSearchResults: (results: SearchResult[]) => void
  clearSearchResults: () => void
  
  // Submit Message
  submitMessage: () => Promise<void>
}

export const useChatStore = create<ChatStore>((set, get) => ({
  // Initial UI State
  sidebarOpen: true,
  activeModal: null,
  selectedView: 'chat',
  
  // Initial Data State
  threads: [],
  selectedThreadId: null,
  messages: [],
  selectedMessageId: null,
  streamingMessage: null,
  messageInput: '',
  attachments: [],
  artifacts: [],
  selectedArtifactId: null,
  documents: [],
  activeToolCalls: new Map(),
  isThinking: false,
  isStreaming: false,
  currentThinkingContent: '',
  searchResults: [],
  
  // UI Actions
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setSelectedView: (view) => set({ selectedView: view }),
  
  // Thread Actions
  createThread: (title) => {
    const id = `thread_${Date.now()}`
    const newThread: Thread = {
      id,
      title: title || 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: []
    }
    set((state) => ({
      threads: [...state.threads, newThread],
      selectedThreadId: id,
      messages: []
    }))
    return id
  },
  
  selectThread: (threadId) => {
    const thread = threadId ? get().threads.find(t => t.id === threadId) : null
    set({
      selectedThreadId: threadId,
      messages: thread?.messages || []
    })
  },
  
  deleteThread: (threadId) => {
    set((state) => ({
      threads: state.threads.filter(t => t.id !== threadId),
      selectedThreadId: state.selectedThreadId === threadId ? null : state.selectedThreadId,
      messages: state.selectedThreadId === threadId ? [] : state.messages
    }))
  },
  
  // Message Actions
  setMessageInput: (input) => set({ messageInput: input }),
  clearMessageInput: () => set({ messageInput: '' }),
  
  addMessage: (message) => {
    set((state) => {
      const newMessages = [...state.messages, message]
      
      // Update thread with new message
      const updatedThreads = state.threads.map(thread => {
        if (thread.id === state.selectedThreadId) {
          return {
            ...thread,
            messages: newMessages,
            updatedAt: new Date()
          }
        }
        return thread
      })
      
      return {
        messages: newMessages,
        threads: updatedThreads
      }
    })
  },
  
  updateStreamingMessage: (content) => {
    set((state) => ({
      streamingMessage: {
        ...state.streamingMessage,
        ...content
      }
    }))
  },
  
  finalizeStreamingMessage: (message) => {
    get().addMessage(message)
    set({ streamingMessage: null, isStreaming: false })
  },
  
  // Attachment Actions
  addAttachment: (attachment) => {
    set((state) => ({
      attachments: [...state.attachments, attachment]
    }))
  },
  
  removeAttachment: (attachmentId) => {
    set((state) => ({
      attachments: state.attachments.filter(a => a.id !== attachmentId)
    }))
  },
  
  clearAttachments: () => set({ attachments: [] }),
  
  // Tool Call Actions
  startToolCall: (id, name) => {
    const toolCall: ToolCallStatus = {
      id,
      name,
      status: 'running',
      startedAt: new Date()
    }
    set((state) => {
      const newMap = new Map(state.activeToolCalls)
      newMap.set(id, toolCall)
      return { activeToolCalls: newMap }
    })
  },
  
  completeToolCall: (id, error) => {
    set((state) => {
      const newMap = new Map(state.activeToolCalls)
      const toolCall = newMap.get(id)
      if (toolCall) {
        newMap.set(id, {
          ...toolCall,
          status: error ? 'failed' : 'completed',
          completedAt: new Date(),
          error
        })
      }
      return { activeToolCalls: newMap }
    })
  },
  
  updateToolCallResult: (id, result) => {
    set((state) => {
      const newMap = new Map(state.activeToolCalls)
      const toolCall = newMap.get(id)
      if (toolCall) {
        newMap.set(id, {
          ...toolCall,
          result
        })
      }
      return { activeToolCalls: newMap }
    })
  },
  
  // Thinking Actions
  updateThinkingContent: (content) => set({ currentThinkingContent: content, isThinking: true }),
  clearThinking: () => set({ currentThinkingContent: '', isThinking: false }),
  
  // Search Actions
  addSearchResults: (results) => set((state) => ({ 
    searchResults: [...state.searchResults, ...results] 
  })),
  clearSearchResults: () => set({ searchResults: [] }),
  
  // Submit Message
  submitMessage: async () => {
    const { messageInput, selectedThreadId, messages } = get()
    
    if (!messageInput.trim()) return
    
    // Create thread if none selected
    let threadId = selectedThreadId
    if (!threadId) {
      threadId = get().createThread()
    }
    
    // Create user message
    const userMessage: Message = {
      id: `msg_user_${Date.now()}`,
      type: 'message',
      role: 'user',
      content: [{ type: 'text', text: messageInput }],
      model: 'claude-opus-4-20250514',
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    }
    
    // Add user message and clear input
    get().addMessage(userMessage)
    set({ messageInput: '', isStreaming: true, streamingMessage: {} })
    
    try {
      // Prepare messages for API (only content)
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      
      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          model: 'claude-opus-4-20250514',
          max_tokens: 4096,
          betaFeatures: ['web-search', 'code-execution', 'thinking'],
          tools: [
            { 
              type: 'web_search_20250305',
              name: 'web_search'
            },
            { 
              type: 'code_execution_20250522',
              name: 'code_execution'
            }
          ]
        })
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      
      // Import parser dynamically to avoid circular dependencies
      const { parseSSEStream } = await import('@/lib/stream-parser')
      
      // Process stream
      let streamingContent = ''
      let messageId = ''
      let thinkingContent = ''
      const contentBlocks: ContentBlock[] = []
      let currentThinkingBlock: any = null
      
      // Clear previous search results and thinking
      get().clearSearchResults()
      get().clearThinking()
      
      for await (const event of parseSSEStream(response)) {
        if (event.type === 'message_start') {
          messageId = event.message.id
          set({ streamingMessage: event.message })
        } else if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            // Track tool use start
            get().startToolCall(event.content_block.id, event.content_block.name)
            contentBlocks.push(event.content_block)
          } else if (event.content_block.type === 'thinking') {
            set({ isThinking: true })
            currentThinkingBlock = { ...event.content_block, thinking: '' }
          } else if (event.content_block.type === 'text') {
            contentBlocks.push(event.content_block)
          }
        } else if (event.type === 'content_block_stop') {
          if (event.content_block?.type === 'tool_use') {
            // Mark tool as complete
            get().completeToolCall(event.content_block.id)
          } else if (event.content_block?.type === 'thinking') {
            set({ isThinking: false })
            // Save the complete thinking block
            if (currentThinkingBlock) {
              currentThinkingBlock.thinking = thinkingContent
              contentBlocks.push(currentThinkingBlock)
            }
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            streamingContent += event.delta.text
            set((state) => ({
              streamingMessage: {
                ...state.streamingMessage,
                content: [{ type: 'text', text: streamingContent }]
              }
            }))
          } else if (event.delta.type === 'thinking_delta') {
            // Handle thinking content
            thinkingContent += event.delta.thinking
            get().updateThinkingContent(thinkingContent)
          } else if (event.delta.type === 'tool_result_delta') {
            // Handle tool results (e.g., search results)
            if (event.delta.tool_name === 'web_search' && event.delta.result) {
              // Parse and add search results
              try {
                const results = JSON.parse(event.delta.result)
                if (Array.isArray(results)) {
                  get().addSearchResults(results)
                }
              } catch (e) {
                console.error('Failed to parse search results:', e)
              }
            }
          }
        } else if (event.type === 'message_stop') {
          // Build final content array
          const finalContent: ContentBlock[] = []
          
          // Add thinking blocks and tool use blocks in order
          contentBlocks.forEach(block => {
            if (block.type === 'thinking' || block.type === 'tool_use') {
              finalContent.push(block)
            }
          })
          
          // Add the main text content
          if (streamingContent) {
            finalContent.push({ type: 'text', text: streamingContent })
          }
          
          // Finalize the message
          const finalMessage: Message = {
            id: messageId,
            type: 'message',
            role: 'assistant',
            content: finalContent,
            model: 'claude-opus-4-20250514',
            stop_reason: 'end_turn',
            stop_sequence: null,
            usage: event.message?.usage || { input_tokens: 0, output_tokens: 0 }
          }
          get().finalizeStreamingMessage(finalMessage)
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      set({ isStreaming: false, streamingMessage: null })
      // TODO: Add error handling/display
    }
  }
}))