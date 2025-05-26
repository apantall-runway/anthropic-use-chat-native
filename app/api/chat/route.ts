import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '@anthropic-ai/sdk'

// Helper to create SSE response
function createSSEResponse() {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  return {
    stream: stream.readable,
    write: async (data: string) => {
      await writer.write(encoder.encode(`data: ${data}\n\n`))
    },
    close: async () => {
      await writer.write(encoder.encode('data: [DONE]\n\n'))
      await writer.close()
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      messages, 
      model = 'claude-sonnet-4-20250514', 
      max_tokens = 2048,
      tools = [],
      betaFeatures = []
    } = body

    // Get API key from server-side environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: 'Server API key not configured' }, { status: 500 })
    }

    if (!messages || !Array.isArray(messages)) {
      return Response.json({ error: 'Messages array is required' }, { status: 400 })
    }

    // Build beta header if features are requested
    const betaHeaders: string[] = []
    if (betaFeatures.includes('web-search')) betaHeaders.push('web-search-2025-03-05')
    if (betaFeatures.includes('code-execution')) betaHeaders.push('code-execution-2025-05-22')
    if (betaFeatures.includes('files')) betaHeaders.push('files-api-2025-04-14')
    if (betaFeatures.includes('thinking')) betaHeaders.push('interleaved-thinking-2025-05-14')

    // Initialize Anthropic client with server-side API key and headers
    const anthropic = new Anthropic({
      apiKey: apiKey,
      defaultHeaders: betaHeaders.length > 0 
        ? { 'anthropic-beta': betaHeaders.join(',') }
        : {}
    })

    // Create SSE response
    const { stream, write, close } = createSSEResponse()

    // Start streaming in the background
    ;(async () => {
      try {
        const messageStream = await anthropic.messages.create({
          model,
          max_tokens,
          messages,
          tools: tools.length > 0 ? tools : undefined,
          thinking: betaFeatures.includes('thinking') ? {
            type: 'enabled',
            budget_tokens: Math.floor(Math.min(max_tokens * 0.8, 10000)) // 80% of max_tokens or 10k, whichever is less
          } : undefined,
          stream: true,
        })

        for await (const chunk of messageStream) {
          // Send each chunk as SSE
          await write(JSON.stringify(chunk))
          
          // Log for debugging
          if (chunk.type === 'message_start') {
            console.log('Message started:', chunk.message.id)
          } else if (chunk.type === 'content_block_start') {
            console.log('Content block started:', chunk.content_block)
          } else if (chunk.type === 'content_block_delta') {
            console.log('Content block delta type:', chunk.delta.type)
            if (chunk.delta.type === 'text_delta') {
              console.log('Text delta:', chunk.delta.text.substring(0, 100))
            } else if (chunk.delta.type === 'input_json_delta') {
              console.log('Tool input delta:', chunk.delta)
            } else {
              // Log any other delta types we might not be handling
              console.log('Unknown delta type:', chunk.delta)
            }
          } else if (chunk.type === 'content_block_stop') {
            console.log('Content block stopped:', chunk)
          } else {
            // Log any other event types
            console.log('Other event type:', chunk.type, chunk)
          }
        }

        await close()
      } catch (error) {
        console.error('Streaming error:', error)
        await write(JSON.stringify({ 
          type: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }))
        await close()
      }
    })()

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}