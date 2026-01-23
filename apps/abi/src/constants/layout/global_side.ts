import componentsIcon from '@/assets/imgs/home/components.png'
import DecomponentsIcon from '@/assets/imgs/home/decomponents.png'
import DedialogueIcon from '@/assets/imgs/home/dedialogue.png'
import DehomeIcon from '@/assets/imgs/home/dehome.png'
import DeworkbenchIcon from '@/assets/imgs/home/deworkbench.png'
import dialogueIcon from '@/assets/imgs/home/dialogue.png'
import homeIcon from '@/assets/imgs/home/home.png'
import workbenchIcon from '@/assets/imgs/home/workbench.png'


export const primaryMenuData = [
  { key: 'home', label: '主页', icon: homeIcon, checkIcon: DehomeIcon, url: '/home' },
  { key: 'ai-assistant_conversational-analysis', label: '对话', icon: dialogueIcon, checkIcon: DedialogueIcon, url: '/ai-assistant/conversational-analysis' },
  { key: 'workbench', label: '工作台', icon: workbenchIcon, checkIcon: DeworkbenchIcon, url: '/workbench' },
  { key: 'components', label: '组件', icon: componentsIcon, checkIcon: DecomponentsIcon, url: '/components' },
]

export const itemMap = new Map([
  ['recently-used', '最近使用'],
  ['my-collect', '我的收藏'],
  ['share-manage_my-share', '我的分享'],
  ['manage_user', '系统配置'],
])

export const primaryMenuMap = new Map([
  ['home', '主页'],
  ['ai-assistant_conversational-analysis', '对话'],
  ['workbench', '工作台'],
  ['components', '组件'],
])

