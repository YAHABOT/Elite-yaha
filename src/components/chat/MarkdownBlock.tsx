import React from 'react'

export function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const t = line.trim()
        
        // Headers
        if (t.startsWith('### ')) {
          return <h3 key={i} className="text-lg font-black text-white mt-6 mb-2 uppercase tracking-widest">{renderInline(t.substring(4))}</h3>
        }
        if (t.startsWith('## ')) {
          return <h2 key={i} className="text-xl font-black text-cyan-400 mt-8 mb-3 tracking-widest">{renderInline(t.substring(3))}</h2>
        }
        if (t.startsWith('# ')) {
          return <h1 key={i} className="text-2xl font-black text-primary mt-8 mb-4 tracking-widest">{renderInline(t.substring(2))}</h1>
        }

        // Bullet Points
        if (t.startsWith('- ') || t.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-3 pl-2 my-1">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400/60" />
              <span className="leading-relaxed text-white/80">{renderInline(t.substring(2))}</span>
            </div>
          )
        }

        // Empty lines
        if (!t) return <div key={i} className="h-2" />

        // Regular Paragraphs
        return <p key={i} className="leading-relaxed text-white/80">{renderInline(line)}</p>
      })}
    </div>
  )
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
