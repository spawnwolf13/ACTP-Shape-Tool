import { useAppActions, useStoreSlice } from '../../hooks/useStoreSlice'
import { releaseMediaResource } from '../../state/resources/ResourceRegistry'
import { Button } from '../common/Button'

/** Stop control for an active webcam source — starting is driven by SourcePanel's "Webcam" quick-select. */
export function WebcamCapture() {
  const media = useStoreSlice((state) => state.media)
  const actions = useAppActions()

  if (media.type !== 'webcam') return null

  function stopWebcam() {
    releaseMediaResource(media.resourceId)
    actions.setPath(['media', 'type'], null, { immediate: true, label: 'Stop webcam' })
    actions.setPath(['media', 'resourceId'], null, { immediate: true })
    actions.setPath(['media', 'name'], null, { immediate: true })
    actions.setPath(['media', 'isPlaying'], false, { immediate: true })
  }

  return (
    <Button variant="danger" onClick={stopWebcam}>
      Stop Webcam
    </Button>
  )
}
