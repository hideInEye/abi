import type { TabsProps } from 'antd'
import { useRoute } from '@sa/simple-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import DimensionModeling from './components/dimension-modeling/DimensionModeling'
import MetricModeling from './components/metric-modeling/MetricModeling'
import SemanticTag from './components/semantic-tag/SemanticTag'

type AttributeModelingTabKey = 'dimension' | 'metric' | 'semanticTag'

const DEFAULT_ACTIVE_TAB: AttributeModelingTabKey = 'semanticTag'
const ATTRIBUTE_MODELING_TAB_KEYS: AttributeModelingTabKey[] = ['dimension', 'metric', 'semanticTag']

function normalizeTabKey(tabKey: unknown): AttributeModelingTabKey {
  const key = Array.isArray(tabKey) ? tabKey[0] : tabKey
  return ATTRIBUTE_MODELING_TAB_KEYS.includes(key as AttributeModelingTabKey)
    ? (key as AttributeModelingTabKey)
    : DEFAULT_ACTIVE_TAB
}

export const Component: React.FC = () => {
  const route = useRoute()
  const queryTab = route.query?.tab
  const [activeTab, setActiveTab] = useState<AttributeModelingTabKey>(() => normalizeTabKey(queryTab))

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as AttributeModelingTabKey)
  }, [])

  useEffect(() => {
    setActiveTab(normalizeTabKey(queryTab))
  }, [queryTab])

  const tabItems = useMemo<TabsProps['items']>(() => [
    {
      children: (
        <div className="h-full min-h-0 p-4">
          <DimensionModeling />
        </div>
      ),
      key: 'dimension',
      label: '维度建模'
    },
    {
      children: (
        <div className="h-full min-h-0 p-4">
          <MetricModeling />
        </div>
      ),
      key: 'metric',
      label: '指标建模'
    },
    {
      children: (
        <div className="h-full min-h-0 p-4">
          <SemanticTag />
        </div>
      ),
      key: 'semanticTag',
      label: '标签语义'
    }
  ], [])

  return (
    <div className="h-full min-h-500px flex-col-stretch overflow-hidden lt-sm:overflow-auto">
      <ACard
        className="flex-col-stretch sm:flex-1-hidden border-0 card-wrapper"
        styles={{ body: { display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: 0 } }}
      >
        <ATabs
          activeKey={activeTab}
          className="h-full min-h-0"
          items={tabItems}
          style={{ flex: 1, minHeight: 0 }}
          onChange={handleTabChange}
        />
      </ACard>
    </div>
  )
}
