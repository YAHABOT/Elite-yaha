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
    if (t.startsWith('- ') || t.startsWith('* ')) {
      elements.push(
        <div key={i} className="flex gap-3 pl-2 my-1">
          <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/60" />
          <span className="leading-relaxed text-white/80">{renderInline(t.substring(2))}</span>
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
    elements.push(<p key={i} className="leading-relaxed text-white/80">{renderInline(line)}</p>)
    i++
  }

  return <div className="space-y-2">{elements}</div>
}

function renderInline(text: string) {
  // Handle bold **text**
  const boldParts = text.split(/(\*\*.*?\*\*)/g)
  return (
    <>
      {boldParts.map((part, i) => {
        if (!part) return null
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-bold text-white">
              {part.slice(2, -2)}
            </strong>
          )
        }
        
        // Handle italics *text* or _text_ inside the non-bold part
        const italicParts = part.split(/(\*.*?\*|_.*?_)/g)
        return (
          <React.Fragment key={i}>
            {italicParts.map((sub, j) => {
              if (!sub) return null
              if ((sub.startsWith('*') && sub.endsWith('*')) || (sub.startsWith('_') && sub.endsWith('_'))) {
                return <em key={j} className="italic text-white/90">{sub.slice(1, -1)}</em>
              }
              return <span key={j}>{sub}</span>
            })}
          </React.Fragment>
        )
      })}
    </>
  )
}
