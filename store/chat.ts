import { create } from 'zustand'
import type { Message, ContentBlock } from '@anthropic-ai/sdk'

// Thread type
interface Thread {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  abortController?: AbortController
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

// Simplified store interface
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
  
  // Input State
  messageInput: string
  attachments: Attachment[]
  
  // Artifacts/Documents  
  artifacts: Artifact[]
  selectedArtifactId: string | null
  
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
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  
  // Attachment Actions
  addAttachment: (attachment: Attachment) => void
  removeAttachment: (attachmentId: string) => void
  clearAttachments: () => void
  
  // Submit Message
  submitMessage: () => Promise<void>
  
  // Derived State Selectors
  getStreamingMessage: () => Message | null
  getActiveToolCalls: () => ContentBlock[]
  isStreaming: () => boolean
  hasThinkingBlock: () => boolean
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
  messageInput: '',
  attachments: [],
  artifacts: [],
  selectedArtifactId: null,
  
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
    // Cancel any active request for this thread
    const thread = get().threads.find(t => t.id === threadId)
    thread?.abortController?.abort()
    
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
      
      // Update thread's messages
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
  
  updateMessage: (messageId, updates) => {
    set((state) => {
      const newMessages = state.messages.map(msg => 
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
      
      // Update thread's messages
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
  
  // Attachment Actions
  addAttachment: (attachment) => set((state) => ({ 
    attachments: [...state.attachments, attachment] 
  })),
  removeAttachment: (attachmentId) => set((state) => ({
    attachments: state.attachments.filter(a => a.id !== attachmentId)
  })),
  clearAttachments: () => set({ attachments: [] }),
  
  // Derived State Selectors
  getStreamingMessage: () => {
    const messages = get().messages
    const lastMessage = messages[messages.length - 1]
    // A message is streaming if it's from assistant and has no stop_reason
    return lastMessage?.role === 'assistant' && !lastMessage.stop_reason 
      ? lastMessage 
      : null
  },
  
  getActiveToolCalls: () => {
    const streamingMsg = get().getStreamingMessage()
    if (!streamingMsg) return []
    
    return streamingMsg.content.filter(block => 
      (block.type === 'tool_use' || block.type === 'server_tool_use')
    )
  },
  
  isStreaming: () => {
    return get().getStreamingMessage() !== null
  },
  
  hasThinkingBlock: () => {
    const streamingMsg = get().getStreamingMessage()
    if (!streamingMsg) return false
    
    return streamingMsg.content.some(block => 
      block.type === 'thinking' && block.thinking !== undefined
    )
  },
  
  // Submit Message
  submitMessage: async () => {
    const { messageInput, selectedThreadId, messages } = get()
    
    if (!messageInput.trim()) return
    
    // Create thread if none selected
    let threadId = selectedThreadId
    if (!threadId) {
      threadId = get().createThread()
    }
    
    // Cancel any existing request for this thread
    const thread = get().threads.find(t => t.id === threadId)
    thread?.abortController?.abort()
    
    // Create new abort controller
    const abortController = new AbortController()
    set((state) => ({
      threads: state.threads.map(t => 
        t.id === threadId ? { ...t, abortController } : t
      )
    }))
    
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
    set({ messageInput: '' })
    
    // Create assistant message that we'll update as we stream
    const assistantMessage: Message = {
      id: `msg_asst_${Date.now()}`,
      type: 'message', 
      role: 'assistant',
      content: [],
      model: 'claude-opus-4-20250514',
      stop_reason: null,
      stop_sequence: null,
      usage: { input_tokens: 0, output_tokens: 0 }
    }
    get().addMessage(assistantMessage)
    
    try {
      // Prepare messages for API (only content)
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }))
      
      console.log('Sending request to API...')
      
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
        }),
        signal: abortController.signal
      })
      
      console.log('Response received:', response.ok, response.status)
      
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }
      
      // Import parser dynamically to avoid circular dependencies
      const { parseSSEStream } = await import('@/lib/stream-parser')
      console.log('Parser imported, starting stream processing...')
      
      // Process stream
      const contentBlocks: ContentBlock[] = []
      
      for await (const event of parseSSEStream(response)) {
        console.log('Stream event:', event.type, event)
        
        if (event.type === 'message_start') {
          // Update message ID if provided
          if (event.message.id) {
            const oldId = assistantMessage.id
            const newId = event.message.id
            console.log('Updating message ID from', oldId, 'to', newId)
            
            // Update the message with the new ID
            set((state) => ({
              messages: state.messages.map(msg => 
                msg.id === oldId ? { ...msg, id: newId } : msg
              ),
              threads: state.threads.map(thread => 
                thread.id === state.selectedThreadId 
                  ? { 
                      ...thread, 
                      messages: thread.messages.map(msg => 
                        msg.id === oldId ? { ...msg, id: newId } : msg
                      )
                    }
                  : thread
              )
            }))
            
            // Update our local reference
            assistantMessage.id = newId
          }
        } else if (event.type === 'content_block_start') {
          const blockIndex = event.index || contentBlocks.length
          console.log('Content block start:', event.content_block.type, 'at index', blockIndex)
          
          // Initialize the block in the array
          if (event.content_block.type === 'tool_use' || event.content_block.type === 'server_tool_use') {
            contentBlocks[blockIndex] = event.content_block
          } else if (event.content_block.type === 'web_search_tool_result') {
            console.log('Web search results received:', event.content_block)
            contentBlocks[blockIndex] = event.content_block
          } else if (event.content_block.type === 'thinking') {
            contentBlocks[blockIndex] = { ...event.content_block, thinking: '' }
          } else if (event.content_block.type === 'text') {
            contentBlocks[blockIndex] = { ...event.content_block, text: '', citations: event.content_block.citations || [] }
          }
          
          // Update message with current blocks
          get().updateMessage(assistantMessage.id, { 
            content: contentBlocks.filter(b => b !== undefined) 
          })
        } else if (event.type === 'content_block_delta') {
          const deltaIndex = event.index || 0
          
          if (event.delta.type === 'text_delta') {
            // Get the block at deltaIndex
            const block = contentBlocks[deltaIndex]
            if (block && block.type === 'text') {
              block.text += event.delta.text
              contentBlocks[deltaIndex] = block
              console.log(`Text accumulated at index ${deltaIndex}:`, block.text)
            } else {
              console.log(`No text block at index ${deltaIndex}, blocks:`, contentBlocks)
            }
          } else if (event.delta.type === 'citations_delta') {
            console.log('Citation delta:', event.delta.citation)
            const block = contentBlocks[deltaIndex]
            if (block && block.type === 'text' && event.delta.citation) {
              if (!block.citations) {
                block.citations = []
              }
              block.citations.push(event.delta.citation)
              contentBlocks[deltaIndex] = block
            }
          } else if (event.delta.type === 'thinking_delta') {
            // Get the block at deltaIndex
            const block = contentBlocks[deltaIndex]
            if (block && block.type === 'thinking') {
              block.thinking += event.delta.thinking
              contentBlocks[deltaIndex] = block
            }
          } else if (event.delta.type === 'input_json_delta') {
            console.log('Tool input delta:', event.delta)
          } else {
            console.log('Unknown delta type:', event.delta)
          }
          
          // Update message with current blocks
          get().updateMessage(assistantMessage.id, { 
            content: contentBlocks.filter(b => b !== undefined) 
          })
        } else if (event.type === 'message_delta') {
          // Handle message delta for stop_reason and usage
          if (event.delta?.stop_reason) {
            console.log('Setting stop_reason:', event.delta.stop_reason)
            get().updateMessage(assistantMessage.id, {
              stop_reason: event.delta.stop_reason,
              usage: event.usage || { input_tokens: 0, output_tokens: 0 }
            })
          }
        } else if (event.type === 'message_stop') {
          // Clean up and finalize
          const cleanedContentBlocks = contentBlocks.filter(block => block !== undefined)
          
          console.log('Final content blocks:', JSON.stringify(cleanedContentBlocks, null, 2))
          
          // The content is already updated, and stop_reason/usage come from message_delta
          // Just log that we're done
          console.log('Message completed')
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted')
        // Remove the incomplete assistant message
        set((state) => ({
          messages: state.messages.filter(m => m.id !== assistantMessage.id)
        }))
      } else {
        console.error('Chat error:', error)
        // Update the assistant message with error
        get().updateMessage(assistantMessage.id, {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          stop_reason: 'error'
        })
      }
    } finally {
      // Clean up abort controller
      set((state) => ({
        threads: state.threads.map(t => 
          t.id === threadId ? { ...t, abortController: undefined } : t
        )
      }))
    }
  }
}))