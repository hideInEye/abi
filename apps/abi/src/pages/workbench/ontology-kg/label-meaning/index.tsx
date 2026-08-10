import { useRoute } from '@sa/simple-router'
import type { TabsProps } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import DimensionModeling from './components/dimension-modeling/DimensionModeling'
import MetricModeling from './components/metric-modeling/MetricModeling'
import SemanticTag from './components/semantic-tag/SemanticTag'

type AttributeModelingTabKey = 'dimension' | 'metric' | 'semanticTag'

const DEFAULT_ACTIVE_TAB: AttributeModelingTabKey = 'dimension'
const ATTRIBUTE_MODELING_TAB_KEYS: AttributeModelingTabKey[] = ['dimension', 'metric', 'semanticTag']

function normalizeTabKey(tabKey: unknown): AttributeModelingTabKey {
  const key = Array.isArray(tabKey) ? tabKey[0] : tabKey
  return ATTRIBUTE_MODELING_TAB_KEYS.includes(key as AttributeModelingTabKey) ? (key as AttributeModelingTabKey) : DEFAULT_ACTIVE_TAB
}

export const Component: React.FC = () => {
  const route = useRoute()
  const queryTab = route.query?.tab
  const [activeTab, setActiveTab] = useState<AttributeModelingTabKey>(() => normalizeTabKey(queryTab))

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as AttributeModelingTabKey)
  }, [])

  const switchToMetricTab = useCallback(() => {
    setActiveTab('metric')
  }, [])

  useEffect(() => {
    setActiveTab(normalizeTabKey(queryTab))
  }, [queryTab])

  const tabItems = useMemo<TabsProps['items']>(
    () => [
      {
        key: 'dimension',
        label: '维度建模',
      },
      {
        key: 'metric',
        label: '指标建模',
      },
      {
        key: 'semanticTag',
        label: '标签语义',
      },
    ],
    [],
  )

  return (
    <div className="h-full min-h-500px flex flex-col overflow-hidden lt-sm:overflow-auto">
      <ATabs activeKey={activeTab} animated={false} className="abi-attr-modeling-tabs abi-attr-modeling-tabs--nav-only" items={tabItems} onChange={handleTabChange} />
      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'dimension' && <DimensionModeling onGoMetricModeling={switchToMetricTab} />}
        {activeTab === 'metric' && <MetricModeling />}
        {activeTab === 'semanticTag' && <SemanticTag />}
      </div>
    </div>
  )
}
