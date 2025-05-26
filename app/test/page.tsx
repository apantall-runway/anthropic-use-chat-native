'use client'

import { useChatStore } from '@/store/chat'

export default function TestPage() {
  // Direct store access to avoid SSR issues
  const sidebarOpen = useChatStore((state) => state.sidebarOpen)
  const activeModal = useChatStore((state) => state.activeModal)
  const selectedView = useChatStore((state) => state.selectedView)
  const threads = useChatStore((state) => state.threads)
  const selectedThreadId = useChatStore((state) => state.selectedThreadId)
  const messages = useChatStore((state) => state.messages)
  const messageInput = useChatStore((state) => state.messageInput)
  const attachments = useChatStore((state) => state.attachments)
  
  // Use selectors for derived state
  const getStreamingMessage = useChatStore((state) => state.getStreamingMessage)
  const getActiveToolCalls = useChatStore((state) => state.getActiveToolCalls)
  const isStreaming = useChatStore((state) => state.isStreaming)
  const hasThinkingBlock = useChatStore((state) => state.hasThinkingBlock)
  
  // Get derived values
  const streamingMessage = getStreamingMessage()
  const activeToolCalls = getActiveToolCalls()
  const streaming = isStreaming()
  const hasThinking = hasThinkingBlock()
  
  // Actions
  const setMessageInput = useChatStore((state) => state.setMessageInput)
  const submitMessage = useChatStore((state) => state.submitMessage)
  const createThread = useChatStore((state) => state.createThread)
  const toggleSidebar = useChatStore((state) => state.toggleSidebar)
  const setSelectedView = useChatStore((state) => state.setSelectedView)
  
  // Construct state object for display
  const state = {
    sidebarOpen,
    activeModal,
    selectedView,
    threads,
    selectedThreadId,
    messages,
    streamingMessage,
    messageInput,
    attachments,
    isStreaming: streaming,
    activeToolCalls,
    hasThinking
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 text-black">
      <div className="max-w-7xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Anthropic Chat Test Page</h1>
        
        {/* Server Status */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2 text-gray-900">Server Status</h2>
          <p className="text-green-600">✓ API Key configured server-side</p>
        </div>
        
        {/* Active Tool Calls */}
        {activeToolCalls.length > 0 && (
          <div className="bg-yellow-50 p-4 rounded-lg shadow border-2 border-yellow-300">
            <h2 className="font-semibold mb-2 text-yellow-900">🔧 Active Tools</h2>
            <div className="space-y-1">
              {activeToolCalls.map((tool, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="font-medium">{tool.name}</span>
                  <span className="text-gray-600">(running)</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        
        {/* Message Input */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2 text-gray-900">Send Message</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  submitMessage()
                }
              }}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded"
              disabled={streaming}
            />
            <button
              onClick={() => submitMessage()}
              disabled={streaming || !messageInput.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              {streaming ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
        
        {/* Messages Display */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2 text-gray-900">Messages</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.length === 0 && !streamingMessage ? (
              <p className="text-gray-600">No messages yet</p>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <div key={idx} className={`p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <p className="font-semibold text-sm mb-1 text-gray-800">{msg.role}</p>
                    {msg.content.map((block, blockIdx) => (
                      <div key={blockIdx} className="mb-2">
                        {block.type === 'text' && (
                          <div>
                            <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-900">
                              {block.text}
                            </p>
                            {block.citations && block.citations.length > 0 && (
                              <div className="mt-2 text-xs text-gray-600">
                                <p className="font-semibold mb-1">Citations:</p>
                                {block.citations.map((citation: any, citIdx: number) => (
                                  <div key={citIdx} className="ml-2 mb-1">
                                    <a href={citation.url} target="_blank" rel="noopener noreferrer" 
                                       className="text-blue-600 hover:underline">
                                      {citation.title || citation.url}
                                    </a>
                                    {citation.cited_text && (
                                      <p className="text-gray-500 italic">"{citation.cited_text}"</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        {block.type === 'thinking' && (
                          <details className="bg-blue-50 p-2 rounded border border-blue-200">
                            <summary className="cursor-pointer text-sm font-medium text-blue-800">
                              🤔 View thinking process
                            </summary>
                            <p className="text-sm text-blue-700 mt-2 whitespace-pre-wrap">
                              {block.thinking}
                            </p>
                          </details>
                        )}
                        {(block.type === 'tool_use' || block.type === 'server_tool_use') && (
                          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                            <p className="text-sm font-medium text-yellow-800">
                              🔧 Tool: {block.name} {block.type === 'server_tool_use' && '(server)'}
                            </p>
                            {block.input && (
                              <pre className="text-xs text-yellow-700 mt-1">
                                {JSON.stringify(block.input, null, 2)}
                              </pre>
                            )}
                          </div>
                        )}
                        {block.type === 'web_search_tool_result' && (
                          <div className="bg-green-50 p-2 rounded border border-green-200">
                            <p className="text-sm font-medium text-green-800 mb-2">
                              🔍 Search Results
                            </p>
                            {block.content && block.content.map((result: any, resIdx: number) => (
                              <div key={resIdx} className="mb-2 text-sm">
                                {result.type === 'web_search_result' && (
                                  <div className="pl-2 border-l-2 border-green-300">
                                    <a href={result.url} target="_blank" rel="noopener noreferrer"
                                       className="font-medium text-green-700 hover:underline">
                                      {result.title}
                                    </a>
                                    {result.snippet && (
                                      <p className="text-gray-600 text-xs mt-1">{result.snippet}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
                {streamingMessage && (
                  <div className="p-3 rounded-lg bg-gray-100 border-2 border-blue-500">
                    <p className="font-semibold text-sm mb-1 text-gray-800">assistant (streaming)</p>
                    {streamingMessage.content && streamingMessage.content.length > 0 ? (
                      streamingMessage.content.map((block: any, blockIdx: number) => (
                        <div key={blockIdx} className="mb-2">
                          {block.type === 'text' && block.text && (
                            <p className="text-base leading-relaxed whitespace-pre-wrap text-gray-900">
                              {block.text}
                            </p>
                          )}
                          {block.type === 'thinking' && block.thinking && (
                            <details className="bg-blue-50 p-2 rounded border border-blue-200">
                              <summary className="cursor-pointer text-sm font-medium text-blue-800">
                                🤔 Thinking...
                              </summary>
                              <p className="text-sm text-blue-700 mt-2 whitespace-pre-wrap">
                                {block.thinking}
                              </p>
                            </details>
                          )}
                          {(block.type === 'server_tool_use' || block.type === 'tool_use') && (
                            <div className="bg-yellow-50 p-2 rounded border border-yellow-200 animate-pulse">
                              <p className="text-sm font-medium text-yellow-800">
                                🔧 Using {block.name}...
                              </p>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">...</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Raw State Display */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2 text-gray-900">Raw Zustand State</h2>
          <pre className="text-xs overflow-x-auto bg-gray-100 p-2 rounded">
            {JSON.stringify(state, null, 2)}
          </pre>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-semibold mb-2 text-gray-900">Quick Actions</h2>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => createThread('Test Thread')}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            >
              Create Thread
            </button>
            <button
              onClick={() => toggleSidebar()}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
            >
              Toggle Sidebar
            </button>
            <button
              onClick={() => setSelectedView(selectedView === 'chat' ? 'artifacts' : 'chat')}
              className="px-3 py-1 bg-indigo-500 text-white rounded text-sm"
            >
              Switch View
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}