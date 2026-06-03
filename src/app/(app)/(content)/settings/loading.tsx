export default function SettingsLoading(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-7 w-24 rounded-lg bg-white/[0.05]" />
      {/* Section cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded-2xl border border-white/5 bg-white/[0.03]" />
      ))}
    </div>
  )
}
