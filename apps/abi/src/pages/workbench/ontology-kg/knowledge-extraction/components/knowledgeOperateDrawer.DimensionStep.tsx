import React from 'react'

export const KnowledgeOperateDimensionStep: React.FC = () => {
  return (
    <>
      <div className="mb-4 text-lg font-semibold">三、维度配置</div>
      <AAlert
        showIcon
        className="mb-3"
        message="第三步维度配置暂缓开发，当前版本不做维度选择。"
        type="info"
      />
    </>
  )
}
