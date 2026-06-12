export const primaryMenuData = [
  { key: 'home', label: '主页',name:'home', icon: 'nav-home', url: '/home' },
  { key: 'chat-ui',name:'chat-ui', label: '对话', icon: 'nav-chat', url: '/ai-assistant/conversational-analysis' },
  { key: 'workbench', name:'assistant-manage_assistant-config',label: '工作台', icon: 'sider-workbench', url: '/workbench' },
  { key: 'component', name:'system_model',label: '组件', icon: 'sider-components', url: '/component' },
]

export const itemMap = new Map([
  ['manage_user', '系统配置'],
  ['space_user', '空间管理'],
])

export const primaryMenuMap = new Map([
  ['home', '主页'],
  ['ai-assistant_conversational-analysis', '对话'],
  ['assistant-manage_assistant-config', '工作台'],
  ['system_model', '组件'],
])

