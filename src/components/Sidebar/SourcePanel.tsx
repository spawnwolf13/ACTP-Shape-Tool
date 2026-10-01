import { MediaDropzone } from '../MediaIngestion/MediaDropzone'
import { PlaybackControls } from '../MediaIngestion/PlaybackControls'
import { WebcamCapture } from '../MediaIngestion/WebcamCapture'
import { useStoreSlice } from '../../hooks/useStoreSlice'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'

export function SourcePanel() {
  const media = useStoreSlice((state) => state.media)

  const thumbnail =
    media.type === 'image' ? resourceRegistry.get<HTMLImageElement>(media.resourceId)?.src : undefined

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Source</h3>

      {media.name && (
        <div className="flex items-center gap-2 rounded border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
          ) : (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-neutral-800 text-neutral-500">
              {media.type === 'webcam' ? '●' : '▶'}
            </span>
          )}
          <span className="truncate text-neutral-300" title={media.name}>
            {media.name}
          </span>
        </div>
      )}

      <MediaDropzone />

      <div className="flex flex-wrap items-center gap-2">
        <WebcamCapture />
        <PlaybackControls />
      </div>
    </section>
  )
}
