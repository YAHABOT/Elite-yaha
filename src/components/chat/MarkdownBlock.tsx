'use client'

import React, { useState } from 'react'

function CollapsibleSection({ summary, children }: { summary: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="my-3 border border-white/10 rounded-xl overflow-hidden bg-white/3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 text-cyan-400 font-bold text-xs uppercase tracking-wider transition-colors text-left"
      >
        <span>{summary}</span>
        <span className="text-white/60 text-[10px]">{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/2 text-sm text-white/85 leading-relaxed space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div className="relative w-full max-w-xl aspect-video my-3 rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black">
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  )
}

export function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const t = line.trim()

    // Collapsible details block
    if (t.toLowerCase().startsWith('<details')) {
      let summaryText = 'View Cues'
      const detailLines: string[] = []
      i++ // Skip <details>
      
      // Skip any blank lines before summary
      while (i < lines.length && !lines[i].trim()) {
        i++
      }
      
      // Parse summary line if it exists
      if (i < lines.length && lines[i].trim().toLowerCase().startsWith('<summary')) {
        const sumLine = lines[i].trim()
        const match = sumLine.match(/<summary[^>]*>(.*?)<\/summary>/i)
        if (match) {
          summaryText = match[1]
        } else {
          summaryText = sumLine.replace(/<summary[^>]*>/i, '').replace(/<\/summary>/i, '')
        }
        i++
      }
      
      while (i < lines.length && !lines[i].trim().toLowerCase().startsWith('</details')) {
        detailLines.push(lines[i])
        i++
      }
      if (i < lines.length) {
        i++ // Skip </details>
      }
      
      elements.push(
        <CollapsibleSection key={`details-${i}`} summary={summaryText}>
          <MarkdownBlock content={detailLines.join('\n')} />
        </CollapsibleSection>
      )
      continue
    }

    // Table parsing
    if (t.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }

      if (tableLines.length >= 2) {
        // Table headers from first line
        const headers = tableLines[0]
          .split('|')
          .map(s => s.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        
        const athleteColIdx = headers.findIndex(h => h.toLowerCase() === 'athlete')
        const filteredHeaders = athleteColIdx !== -1 
          ? headers.filter((_, idx) => idx !== athleteColIdx)
          : headers

        // Check if second line is a separator line (e.g. contains dashes/colons)
        const isSeparator = tableLines[1].replace(/[:|\s-]/g, '') === ''
        const startRowIdx = isSeparator ? 2 : 1

        const rows: string[][] = []
        for (let r = startRowIdx; r < tableLines.length; r++) {
          const cells = tableLines[r]
            .split('|')
            .map(s => s.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          
          const filteredCells = athleteColIdx !== -1
            ? cells.filter((_, idx) => idx !== athleteColIdx)
            : cells
          rows.push(filteredCells)
        }

        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-4 rounded-xl border border-white/10 bg-white/5">
            <table className="min-w-full divide-y divide-white/10 text-xs">
              <thead className="bg-white/5">
                <tr>
                  {filteredHeaders.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-3 text-left font-bold text-cyan-400 uppercase tracking-wider">
                      {renderInline(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/5 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-3 text-white/80 leading-relaxed">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
      continue
    }

    // Headers
    if (t.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-black text-white mt-6 mb-2 uppercase tracking-widest">{renderInline(t.substring(4))}</h3>)
      i++
      continue
    }
    if (t.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xl font-black text-cyan-400 mt-8 mb-3 tracking-widest">{renderInline(t.substring(3))}</h2>)
      i++
      continue
    }
    if (t.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-black text-primary mt-8 mb-4 tracking-widest">{renderInline(t.substring(2))}</h1>)
      i++
      continue
    }

    // Bullet Points
    if (t.startsWith('- ') || t.startsWith('* ') || t.startsWith('• ')) {
      const contentText = t.replace(/^[\-\*\•]\s+/, '')
      const ytMatch = contentText.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i)
      elements.push(
        <div key={i} className="space-y-2">
          <div className="flex gap-3 pl-2 my-1">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/60" />
            <span className="leading-relaxed text-white/80">{renderInline(contentText)}</span>
          </div>
          {ytMatch && (
            <div className="pl-6">
              <YouTubeEmbed videoId={ytMatch[1]} />
            </div>
          )}
        </div>
      )
      i++
      continue
    }

    // Empty lines
    if (!t) {
      elements.push(<div key={i} className="h-2" />)
      i++
      continue
    }

    // Regular Paragraphs
    const ytMatch = line.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/i)
    elements.push(
      <div key={i} className="space-y-2">
        <p className="leading-relaxed text-white/80">{renderInline(line)}</p>
        {ytMatch && <YouTubeEmbed videoId={ytMatch[1]} />}
      </div>
    )
    i++
  }

  return <div className="space-y-2">{elements}</div>
}

function renderInline(text: string) {
  // Parse markdown links [Label](URL) or [Label] (URL) with optional whitespace
  const linkRegex = /\[([^\]]+)\]\s*\(([^)]+)\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match
  
  while ((match = linkRegex.exec(text)) !== null) {
    const matchIndex = match.index
    const plainText = text.substring(lastIndex, matchIndex)
    const label = match[1]
    const url = match[2]
    
    if (plainText) {
      parts.push(...parseBoldItalics(plainText))
    }
    
    parts.push(
      <a
        key={`link-${matchIndex}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors break-all"
      >
        {label}
      </a>
    )
    
    lastIndex = linkRegex.lastIndex
  }
  
  const remainingText = text.substring(lastIndex)
  if (remainingText) {
    parts.push(...parseBoldItalics(remainingText))
  }
  
  return parts
}

function parseBoldItalics(text: string): React.ReactNode[] {
  const boldParts = text.split(/(\*\*.*?\*\*)/g)
  return boldParts.map((part, i) => {
    if (!part) return null
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`bold-${i}`} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    
    const italicParts = part.split(/(\*.*?\*|_.*?_)/g)
    return (
      <React.Fragment key={`text-${i}`}>
        {italicParts.map((sub, j) => {
          if (!sub) return null
          if ((sub.startsWith('*') && sub.endsWith('*')) || (sub.startsWith('_') && sub.endsWith('_'))) {
            return <em key={`italic-${j}`} className="italic text-white/90">{sub.slice(1, -1)}</em>
          }
          return <span key={`span-${j}`}>{sub}</span>
        })}
      </React.Fragment>
    )
  })
}
