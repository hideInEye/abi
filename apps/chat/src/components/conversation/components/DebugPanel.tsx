import { LazyFeatureFallback, RetryableLazy } from '@/components/performance/RetryableLazy'

const loadModelDebugModal = () => import('../ModelDebugModal')

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
    <RetryableLazy
      loader={loadModelDebugModal}
      componentProps={{ thinkTime, convUid: convUid!, roundIndex: roundIndex!, open, onClose }}
      fallback={<LazyFeatureFallback label="正在加载调试详情…" style={{ position: 'fixed', inset: 0, zIndex: 1000, minHeight: '100vh' }} />}
    />
  )
}

export default DebugPanel
