import type { LucideIcon } from 'lucide-react'

type Props = {
  label: string
  icon: LucideIcon
}

export function SectionHeader({ label, icon: Icon }: Props): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3 w-3 flex-shrink-0" style={{ color: 'rgba(148,163,184,0.4)' }} />
      <span
        className="font-ui uppercase flex-shrink-0"
        style={{ fontSize: '9px', letterSpacing: '0.18em', color: 'rgba(148,163,184,0.4)' }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}
