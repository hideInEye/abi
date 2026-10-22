import { message } from 'antd'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import { useAppSelector } from '@/hooks/business/useStore'
import { getSpaceId } from '@/store/slice/app'

import type { MetadataAnalysisContext, MetadataAnalysisDrawerProps } from './types'

const AnalysisDrawer = lazy(() => import('./MetadataAnalysisDrawer'))

// 关系图依赖较重，列表仅在打开分析时加载，不随每个列表入口同步加载。
function MetadataAnalysisDrawer(props: MetadataAnalysisDrawerProps) {
  if (!props.open) return null

  return (
    <Suspense fallback={null}>
      <AnalysisDrawer {...props} />
    </Suspense>
  )
}

export function useMetadataAnalysis() {
  const spaceId = useAppSelector(getSpaceId)
  const [context, setContext] = useState<MetadataAnalysisContext | null>(null)
  const closeAnalysis = useCallback(() => setContext(null), [])
  const openAnalysis = useCallback((node: Omit<MetadataAnalysisContext, 'spaceId'>) => {
    // 缺失主键不能退化为整类节点查询，更不能使用其他业务 ID 替代。
    if (node.nodeId === undefined || node.nodeId === null || String(node.nodeId).trim() === '') {
      message.warning('未获取到元数据节点ID')
      return
    }
    setContext({ ...node, spaceId: spaceId || undefined })
  }, [spaceId])

  useEffect(closeAnalysis, [closeAnalysis, spaceId])

  return {
    // 切换空间的首帧就隐藏旧节点，避免分析继续显示上一空间的数据。
    analysisContext: context?.spaceId === (spaceId || undefined) ? context : null,
    closeAnalysis,
    openAnalysis,
  }
}

export default MetadataAnalysisDrawer
export type { MetadataAnalysisContext } from './types'
