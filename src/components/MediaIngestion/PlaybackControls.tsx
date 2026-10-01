import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { resourceRegistry } from '../../state/resources/ResourceRegistry'
import { Button } from '../common/Button'

/** Play/Pause for video/webcam sources — also what SVG export's "paused frame only" rule keys off. */
export function PlaybackControls() {
  const media = useStoreSlice((state) => state.media)
  const actions = useAppActions()

  if (media.type !== 'video' && media.type !== 'webcam') return null

  function toggle() {
    const element = resourceRegistry.get<HTMLVideoElement>(media.resourceId)
    if (!element) return
    if (media.isPlaying) {
      element.pause()
      actions.setPath(['media', 'isPlaying'], false, { immediate: true })
    } else {
      void element.play()
      actions.setPath(['media', 'isPlaying'], true, { immediate: true })
    }
  }

  return (
    <Button variant={media.isPlaying ? 'default' : 'active'} onClick={toggle}>
      {media.isPlaying ? 'Pause' : 'Play'}
    </Button>
  )
}
