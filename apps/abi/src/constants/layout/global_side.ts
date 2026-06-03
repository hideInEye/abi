import componentsIcon from '@/assets/imgs/home/components.png'
import DecomponentsIcon from '@/assets/imgs/home/decomponentss.png'
import DedialogueIcon from '@/assets/imgs/home/机器人头像.png'
import DehomeIcon from '@/assets/imgs/home/homes.png'
import DeworkbenchIcon from '@/assets/imgs/home/deworkbenchs.png'
import dialogueIcon from '@/assets/imgs/home/dialogue.png'
import homeIcon from '@/assets/imgs/home/home.png'
import workbenchIcon from '@/assets/imgs/home/workbench.png'


export const primaryMenuData = [
  { key: 'home', label: '主页',name:'home', icon: DehomeIcon, checkIcon: DehomeIcon, url: '/home' },
  { key: 'chat-ui',name:'chat-ui', label: '对话', icon: DedialogueIcon, checkIcon: DedialogueIcon, url: '/ai-assistant/conversational-analysis' },
  { key: 'workbench', name:'assistant-manage_assistant-config',label: '工作台', icon: DeworkbenchIcon, checkIcon: DeworkbenchIcon, url: '/workbench' },
  { key: 'component', name:'system_model',label: '组件', icon: DecomponentsIcon, checkIcon: DecomponentsIcon, url: '/component' },
]

export const itemMap = new Map([
  ['recently-used', '最近使用'],
  ['my-collect', '我的收藏'],
  ['share-manage_my-share', '我的分享'],
  ['manage_user', '系统配置'],
  ['space_user', '空间管理'],
])

export const primaryMenuMap = new Map([
  ['home', '主页'],
  ['ai-assistant_conversational-analysis', '对话'],
  ['assistant-manage_assistant-config', '工作台'],
  ['system_model', '组件'],
])

