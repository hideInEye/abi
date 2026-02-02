import { Steps as ASteps, Button as AButton } from 'antd'
import { useState } from 'react'
import { SpaceSelection } from './components/SpaceSelection'
import type { ISpaceItem } from '@/pages/space-list/types'
import { Component as DataSourceList } from '@/pages/workbench/data-preparation/data-source'
import { Component as DataCollectionList } from '@/pages/workbench/data-preparation/data-collection'
import { Component as TableSemanticList } from '@/pages/workbench/data-preparation/data-table-meaning'
import { Component as AssistantList } from '@/pages/workbench/assistant-manage/assistant-config'

export function Component() {
  const [current, setCurrent] = useState(0)
  const [selectedSpace, setSelectedSpace] = useState<ISpaceItem | null>(null)
  const items = [{ title: '选择空间' }, { title: '数据源' }, { title: '数据集' }, { title: '表语义' }, { title: '智能助手' }, { title: '智能对话' }]
  
  const handleSelectSpace = (space: ISpaceItem) => {
    setSelectedSpace(space)
  }
  
  const handleNext = () => {
    // 如果在第一步且没有选中空间，则不能继续
    if (current === 0 && !selectedSpace) {
      return
    }
    setCurrent(current + 1)
  }
  
  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 步骤条 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px 0' }}>
        <ASteps items={items} current={current} style={{ maxWidth: '1200px', width: '100%' }} />
      </div>
      <div style={{ height: '1px', backgroundColor: '#e5e7eb' }}></div>
      
      {/* 内容区域 */}
      <div style={{ flex: 1 }}>
        {current === 0 && <SpaceSelection selectedSpaceId={selectedSpace?.spaceId} onSelectSpace={handleSelectSpace} />}
        {current === 1 && selectedSpace && <DataSourceList />}
        {current === 2 && selectedSpace && <DataCollectionList />}
        {current === 3 && selectedSpace && <TableSemanticList />}
        {current === 4 && selectedSpace && <AssistantList />}
        {current === 5 && <div>智能对话</div>}
      </div>
      
      {/* 底部按钮 */}
      <div style={{ backgroundColor: '#f5f5f5', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px 0', gap: '12px' }}>
          {current > 0 && (
            <AButton onClick={() => setCurrent(current - 1)}>
              上一步
            </AButton>
          )}
          <AButton type="primary" onClick={handleNext} disabled={current === 0 && !selectedSpace}>
            {current === 5 ? '完成' : '下一步'}
          </AButton>
        </div>
      </div>
    </div>
  )
}
