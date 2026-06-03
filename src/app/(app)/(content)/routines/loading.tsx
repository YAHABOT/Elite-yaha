export default function RoutinesLoading(): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 rounded-lg bg-white/[0.05]" />
        <div className="h-9 w-32 rounded-xl bg-white/[0.03]" />
      </div>
      {/* Routine card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 rounded-2xl border border-white/5 bg-white/[0.03]" />
      ))}
    </div>
  )
}
