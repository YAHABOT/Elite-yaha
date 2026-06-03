export default function TrackerLoading(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-white/[0.05]" />
        <div className="h-7 w-40 rounded-lg bg-white/[0.05]" />
      </div>
      {/* Log entries skeleton */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 rounded-2xl border border-white/5 bg-white/[0.03]" />
      ))}
    </div>
  )
}
