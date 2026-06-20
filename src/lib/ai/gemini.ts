/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai'
import type { ChatInput, GeminiResponse } from '@/types/action-card'
import { parseActionCards } from './actions'

export const MODEL_NAME = 'gpt-4o-mini'

let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OPENAI_API_KEY environment variable is not set')
    openaiClient = new OpenAI({ apiKey })
  }
  return openaiClient
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

function buildParts(input: ChatInput): ContentPart[] {
  const parts: ContentPart[] = []

  if (input.text) {
    parts.push({ type: 'text', text: input.text })
  }

  if (input.attachments) {
    for (const attachment of input.attachments) {
      if (ALLOWED_MIME_TYPES.has(attachment.mimeType)) {
        parts.push({
          type: 'image_url',
          image_url: {
            url: `data:${attachment.mimeType};base64,${attachment.base64}`
          }
        })
      } else {
         console.warn(`Unsupported attachment MIME type for OpenAI vision: ${attachment.mimeType}`)
      }
    }
  }

  return parts
}

export async function processHealthMessage(
  input: ChatInput,
  systemPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: any }> = []
): Promise<GeminiResponse> {
  console.log(`[OpenAI] Calling ${MODEL_NAME} with input:`, input.text)
  
  try {
    const openai = getOpenAI()
    const currentParts = buildParts(input)

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: currentParts }
    ]

    const result = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages,
    })

    const text = result.choices[0]?.message?.content || ''
    console.log(`[OpenAI] Response received:`, text.substring(0, 100) + '...')
    
    const actions = parseActionCards(text)
    return { text, actions }
  } catch (error: unknown) {
    console.error(`[OpenAI] Error calling ${MODEL_NAME}:`, error instanceof Error ? error.message : error)
    throw error
  }
}

export async function* streamHealthMessage(
  input: ChatInput,
  systemPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: any }> = []
): AsyncGenerator<string> {
  console.log(`[OpenAI] Streaming ${MODEL_NAME}...`)

  try {
    const openai = getOpenAI()
    const currentParts = buildParts(input)

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: currentParts }
    ]

    const stream = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages,
      stream: true,
    })

    let chunkCount = 0
    for await (const chunk of stream) {
      chunkCount++
      const text = chunk.choices[0]?.delta?.content || ''
      if (text) {
        yield text
      }
    }
    console.log(`[OpenAI] Stream complete. Total chunks: ${chunkCount}`)
  } catch (error: unknown) {
    console.error(`[OpenAI] Streaming error for ${MODEL_NAME}:`, error instanceof Error ? error.message : error)
    throw error
  }
}

export async function extractFromImage(
  base64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported format. Use JPEG, PNG, WebP, or GIF. Got: ${mimeType}`)
  }

  console.log('[extractFromImage] Image received (mime: ' + mimeType + '). Extracting labels...')

  try {
    const openai = getOpenAI()

    const result = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ]
        }
      ]
    })

    const text = result.choices[0]?.message?.content || ''
    return text
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[extractFromImage] Vision extraction failed:', errorMsg)
    throw new Error('Unable to read label in image. Please provide text version or re-photograph with better lighting.')
  }
}
