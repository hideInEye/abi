import { $t } from '@/locales'
import s from '../index.module.scss'
import { useRouter } from '~/packages/simple-router/src'

interface DataAssetType {
  count: number
  href?: string
  iconSvg: string
  title: string
  colorClass: string
}

const dataAssetsConfig: DataAssetType[] = [
  {
    count: 0,
    href: '/space-list',
    iconSvg: '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    title: $t('page.home.mySpace'),
    colorClass: 'c1',
  },
  {
    count: 0,
    href: '/workbench/data-preparation/data-source',
    iconSvg: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    title: $t('page.home.dataSource'),
    colorClass: 'c2',
  },
  {
    count: 0,
    href: '/workbench/data-preparation/data-collection',
    iconSvg: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/><line x1="9" y1="15" x2="21" y2="15"/>',
    title: $t('page.home.dataColletion'),
    colorClass: 'c3',
  },
  {
    count: 0,
    href: '/workbench/assistant-manage',
    iconSvg: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16.01"/><line x1="16" y1="16" x2="16" y2="16.01"/>',
    title: $t('page.home.aiBot'),
    colorClass: 'c4',
  },
  {
    count: 0,
    href: '/ai-assistant/conversational-analysis',
    iconSvg: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
    title: $t('page.home.aiChat'),
    colorClass: 'c5',
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
    <div className={s['stats-row']}>
      {dataAssetsConfig.map((item) => (
        <div
          className={s['stat-card']}
          key={item.title}
          onClick={() => {
            if (!item.href) return
            if (item.href === '/ai-assistant/conversational-analysis') {
              window.open(item.href, '_blank')
            } else {
              push(item.href)
            }
          }}
        >
          <div className={`${s['stat-icon']} ${s[item.colorClass]}`}>
            <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: item.iconSvg }} />
          </div>
          <div className={s['stat-num']}>{item.count}</div>
          <div className={s['stat-label']}>{item.title}</div>
        </div>
      ))}
    </div>
  )
}
