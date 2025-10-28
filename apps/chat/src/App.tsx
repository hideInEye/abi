/**
 * 应用根组件
 * 包含应用的主要布局和路由配置
 */

import './App.css'
import ConversationAnalysis from './pages/conversation-analysis'
import DemoPage from './pages/demo'

function App() {
  return (
    <div className="App" style={{ height: '100%' }}>
      {/* 应用主内容区域 */}
      <ConversationAnalysis />
      {/* <DemoPage /> */}
    </div>
  )
}

export default App
