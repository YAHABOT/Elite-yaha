export default function RootLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-12 w-12 rounded-2xl animate-pulse"
          style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(168,85,247,0.2))' }}
        />
        <div className="h-1.5 w-24 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full w-full animate-[shimmer_1.5s_ease-in-out_infinite] rounded-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.4), transparent)',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>
    </div>
  )
}
