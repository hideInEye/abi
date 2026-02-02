/**
 * 应用根组件
 * 包含应用的主要布局和路由配置
 */

import './App.css'
import ConversationAnalysis from './pages/conversation-analysis'

function App({ spaceId }: { spaceId?: number }) {
  return (
    <div className="App" style={{ height: '100%' }}>
      {/* 应用主内容区域 */}
      <ConversationAnalysis spaceId={spaceId} />
      {/* <DemoPage /> */}
    </div>
  )
}

export default App
