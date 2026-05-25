import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ChatInput, GeminiResponse } from '@/types/action-card'
import { parseActionCards } from './actions'

export const GEMINI_MODEL = 'gemini-3.1-flash-lite'

let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is not set')
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

// Must stay in sync with ALLOWED_MIME_TYPES in src/app/api/chat/route.ts — only types Gemini can process via inlineData.
// Office formats (docx/xlsx/xls) are intentionally excluded — Gemini does not support binary Office formats as inlineData.
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/flac',
  'audio/aac',
  'application/pdf',
  'text/plain',
  'text/csv',
])

type ContentPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

function buildParts(input: ChatInput): ContentPart[] {
  const parts: ContentPart[] = []

  if (input.text) {
    parts.push({ text: input.text })
  }

  if (input.attachments) {
    for (const attachment of input.attachments) {
      if (!ALLOWED_MIME_TYPES.has(attachment.mimeType)) {
        throw new Error(`Unsupported attachment MIME type: ${attachment.mimeType}`)
      }
      parts.push({
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.base64,
        },
      })
    }
  }

  return parts
}

export async function processHealthMessage(
  input: ChatInput,
  systemPrompt: string,
  history: Array<{ role: 'user' | 'model'; parts: ContentPart[] }> = []
): Promise<GeminiResponse> {
  console.log(`[Gemini] Calling ${GEMINI_MODEL} with input:`, input.text)
  
  try {
    const model = getGenAI().getGenerativeModel({ 
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt
    })

    const currentParts = buildParts(input)
    const contents = [
      ...history,
      { role: 'user' as const, parts: currentParts }
    ]

    const result = await model.generateContent({ contents })

    const response = await result.response
    const text = response.text()
    console.log(`[Gemini] Response received:`, text.substring(0, 100) + '...')
    
    const actions = parseActionCards(text)
    return { text, actions }
  } catch (error: unknown) {
    console.error(`[Gemini] Error calling ${GEMINI_MODEL}:`, error instanceof Error ? error.message : error)
    throw error
  }
}

export async function* streamHealthMessage(
  input: ChatInput,
  systemPrompt: string,
  history: Array<{ role: 'user' | 'model'; parts: ContentPart[] }> = []
): AsyncGenerator<string> {
  console.log(`[Gemini] Streaming ${GEMINI_MODEL}...`)
  console.log(`[Gemini] Input text: "${input.text}"`)
  console.log(`[Gemini] System prompt length: ${systemPrompt.length} chars`)
  console.log(`[Gemini] History messages: ${history.length}`)

  try {
    const model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt
    })

    const currentParts = buildParts(input)
    console.log(`[Gemini] Current parts built: ${currentParts.length} parts`)
    currentParts.forEach((part, i) => {
      if ('text' in part) {
        console.log(`  [${i}] text: "${part.text.substring(0, 50)}..."`)
      } else if ('inlineData' in part) {
        console.log(`  [${i}] inlineData: ${part.inlineData.mimeType} (${part.inlineData.data.length} bytes)`)
      }
    })

    const contents = [
      ...history,
      { role: 'user' as const, parts: currentParts }
    ]
    console.log(`[Gemini] Total contents: ${contents.length} (history + current)`)

    const result = await model.generateContentStream({ contents })
    console.log(`[Gemini] generateContentStream() returned, starting iteration...`)

    let chunkCount = 0
    for await (const chunk of result.stream) {
      chunkCount++
      const text = chunk.text()
      console.log(`[Gemini] Chunk ${chunkCount}: "${text.substring(0, 100)}..." (${text.length} chars)`)
      yield text
    }
    console.log(`[Gemini] Stream complete. Total chunks: ${chunkCount}`)
  } catch (error: unknown) {
    console.error(`[Gemini] Streaming error for ${GEMINI_MODEL}:`, error instanceof Error ? error.message : error)
    throw error
  }
}

export async function extractFromImage(
  base64: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  // Validate MIME type for vision API (fixes BUG-V32-EX5, EX7, EX8)
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported format. Use JPEG, PNG, WebP, PDF, or audio. Got: ${mimeType}`)
  }

  // Log receipt of image (fixes BUG-V32-EX18, EX19, EX28, EX29, EX33, EX34: vision parsing errors, field mapping)
  console.log('[extractFromImage] Image received (mime: ' + mimeType + '). Extracting labels...')

  try {
    const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL })

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
    })

    const response = await result.response
    const text = response.text()

    // Enforce EXACT VALUE extraction (no rounding/estimation)
    console.log('[extractFromImage] Vision extraction complete. Returned values are EXACT, not rounded.')

    return text
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('[extractFromImage] Vision extraction failed:', errorMsg)
    throw new Error('Unable to read label in image. Please provide text version or re-photograph with better lighting.')
  }
}
