function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function RecordingIndicator({ seconds }: { seconds: number }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-red-400">
      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
      REC {formatElapsed(seconds)}
    </span>
  )
}
