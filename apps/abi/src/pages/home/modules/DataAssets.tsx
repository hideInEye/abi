import aiBot from '@/assets/imgs/home/intelligent_assistant.jpg'
import aiChat from '@/assets/imgs/home/intelligent_talk.jpg'
import dataSource from '@/assets/imgs/home/datasource.jpg'
import dataMap from '@/assets/imgs/home/dataset.jpg'
import space from '@/assets/imgs/home/space.png'
import { $t } from '@/locales'
import { useRouter } from '~/packages/simple-router/src'

/**
 * 数据资产概览组件
 * 显示系统中各类数据资产的统计信息
 * 包含我的空间、数据源、数据集、AI助手、AI对话等模块的数量统计
 * 每个资产卡片都有对应的图标、颜色主题和计数显示
 * 支持点击跳转到相应的管理页面（目前点击事件被注释）
 */
interface DataAssetType {
  count: number // 统计数量
  href?: string // 跳转链接
  icon: string // 图标图片
  title: string // 资产名称
}

const dataAssetsConfig: DataAssetType[] = [
  {
    count: 0,
    href: '/space-list',
    icon: space,
    title: $t('page.home.mySpace'),
  },
  {
    count: 0,
    href: '/data-preparation/data-source',
    icon: dataSource,
    title: $t('page.home.dataSource'),
  },
  {
    count: 0,
    href: '/data-preparation/data-collection',
    icon: dataMap,
    title: $t('page.home.dataColletion'),
  },
  {
    count: 0,
    href: '/ai-assistant/conversational-analysis',
    icon: aiBot,
    title: $t('page.home.aiBot'),
  },
  {
    count: 0,
    href: '/ai-assistant/conversational-analysis',
    icon: aiChat,
    title: $t('page.home.aiChat'),
  },
]

interface DataAssetsProps {
  agentCount: number
  chatCount: number
  dataSetCount: number
  dataSourceCount: number
  spaceCount: number
}

function initDataAssetsConfig(homeData: DataAssetsProps) {
  dataAssetsConfig[0].count = homeData.spaceCount
  dataAssetsConfig[1].count = homeData.dataSourceCount
  dataAssetsConfig[2].count = homeData.dataSetCount
  dataAssetsConfig[3].count = homeData.agentCount
  dataAssetsConfig[4].count = homeData.chatCount
}

export function DataAssets({ homeData }: { readonly homeData: DataAssetsProps }) {
  const { push } = useRouter()
  if (homeData) {
    initDataAssetsConfig(homeData)
  }

  return (
    <div className="grid grid-cols-5 gap-5">
      {dataAssetsConfig.map((item) => (
        <div
          className="cursor-pointer rounded-[0.625rem] p-8 shadow-sm bg-cover bg-center"
          key={item.title}
          style={{ backgroundImage: `url(${item.icon})` }}
        >
          <div className="text-xl text-[#707784]">{item.title}</div>
          <div className="text-5xl text-[#101623]">{item.count}</div>
        </div>
      ))}
    </div>
  )
}
