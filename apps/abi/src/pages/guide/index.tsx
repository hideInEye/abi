import { Steps as ASteps, Button as AButton } from 'antd'
import { useState } from 'react'
import { SpaceSelection } from './components/SpaceSelection'
import type { ISpaceItem } from '@/pages/space-list/types'
import { GuideDataSource } from './components/GuideDataSource'
import { GuideDataCollection } from './components/GuideDataCollection'
import { GuideTableMeaning } from './components/GuideTableMeaning'
import { GuideAssistant } from './components/GuideAssistant'
import { getCurrentSpaceInfo, setCurrentSpaceInfo } from '@/store/slice/app'

export function Component() {
  const [current, setCurrent] = useState(0)
  const selectedSpace = useAppSelector(getCurrentSpaceInfo)
  const dispatch = useAppDispatch()
  const items = [{ title: '选择空间' }, { title: '数据源' }, { title: '数据集' }, { title: '表语义' }, { title: '智能助手' }, { title: '智能对话' }]
  
  const handleSelectSpace = (space: ISpaceItem) => {
    dispatch(setCurrentSpaceInfo(space))
  }
  
  const handleNext = () => {
    // 如果在第一步且没有选中空间，则不能继续
    if (current === 0 && !selectedSpace) {
      return
    }
    setCurrent(current + 1)
  }
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 步骤条 */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px 0' }}>
        <ASteps items={items} current={current} style={{ maxWidth: '1200px', width: '100%' }} />
      </div>
      <div style={{ height: '1px', backgroundColor: '#e5e7eb' }}></div>
      
      {/* 内容区域 */}
      <div style={{ flex: 1 }}>
        {current === 0 && <SpaceSelection selectedSpaceId={selectedSpace?.spaceId} onSelectSpace={handleSelectSpace} />}
        {current === 1 && selectedSpace && <GuideDataSource />}
        {current === 2 && selectedSpace && <GuideDataCollection />}
        {current === 3 && selectedSpace && <GuideTableMeaning />}
        {current === 4 && selectedSpace && <GuideAssistant />}
        {current === 5 && <div>智能对话</div>}
      </div>
      
      {/* 底部按钮 */}
      <div style={{ backgroundColor: 'transparent', borderTop: '1px solid #e5e7eb' }}>
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
