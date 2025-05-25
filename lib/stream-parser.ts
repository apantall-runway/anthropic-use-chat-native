import type { MessageStreamEvent } from '@anthropic-ai/sdk/streaming'

export async function* parseSSEStream(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          
          // Skip the [DONE] message
          if (data === '[DONE]') continue
          
          try {
            const parsed = JSON.parse(data) as MessageStreamEvent
            yield parsed
          } catch (e) {
            console.error('Failed to parse SSE data:', data)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}