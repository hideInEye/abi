import { Suspense, lazy } from 'react'

const ModelDebugModal = lazy(() => import('../ModelDebugModal'))

type DebugPanelProps = {
  open: boolean
  convUid?: number
  roundIndex?: number
  thinkTime?: number
  onClose: () => void
}

const DebugPanel = ({ open, convUid, roundIndex, thinkTime, onClose }: DebugPanelProps) => {
  if (!open) return null

  return (
    <Suspense fallback={null}>
      <ModelDebugModal
        thinkTime={thinkTime}
        convUid={convUid!}
        roundIndex={roundIndex!}
        open={open}
        onClose={onClose}
      />
    </Suspense>
  )
}

export default DebugPanel
