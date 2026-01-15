import { Steps as ASteps, Button as AButton } from 'antd'
import { useState } from 'react'
export function Component() {
  const [current, setCurrent] = useState(0)
  const items = [{ title: '选择空间' }, { title: '数据源' }, { title: '数据集' }, { title: '表语义' }, { title: '智能助手' }, { title: '智能对话' }]
  return (
    <div>
      <ASteps items={items} current={current} />
      {current === 0 && <div>选择空间</div>}
      {current === 1 && <div>数据源</div>}
      {current === 2 && <div>数据集</div>}
      {current === 3 && <div>表语义</div>}
      {current === 4 && <div>智能助手</div>}
      {current === 5 && <div>智能对话</div>}
      <div>
        {current > 0 && (
          <AButton type="primary" onClick={() => setCurrent(current - 1)}>
            上一步
          </AButton>
        )}
        <AButton type="primary" onClick={() => setCurrent(current + 1)}>
          {current === 5 ? '完成' : '下一步'}
        </AButton>
      </div>
    </div>
  )
}
