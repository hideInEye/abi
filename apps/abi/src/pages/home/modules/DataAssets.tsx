import aiBot from '@/assets/imgs/bot.jpg';
import aiChat from '@/assets/imgs/chat.jpg';
import dataSource from '@/assets/imgs/data.jpg';
import dataMap from '@/assets/imgs/dataMap.jpg';
import space from '@/assets/imgs/space.jpg';
import { $t } from '@/locales';
import { useRouter } from '~/packages/simple-router/src';

/**
 * 数据资产概览组件
 * 显示系统中各类数据资产的统计信息
 * 包含我的空间、数据源、数据集、AI助手、AI对话等模块的数量统计
 * 每个资产卡片都有对应的图标、颜色主题和计数显示
 * 支持点击跳转到相应的管理页面（目前点击事件被注释）
 */
interface DataAssetType {
  color?: string; // 主题色
  count: number; // 统计数量
  href?: string; // 跳转链接
  icon: string; // 图标图片
  title: string; // 资产名称
}

const dataAssetsConfig: DataAssetType[] = [
  {
    color: '#875D12',
    count: 0,
    href: '/space-list',
    icon: space,
    title: $t('page.home.mySpace')
  },
  {
    color: '#526618',
    count: 0,
    href: '/data-preparation/data-source',
    icon: dataSource,
    title: $t('page.home.dataSource')
  },
  {
    color: '#7948EA',
    count: 0,
    href: '/data-preparation/data-collection',
    icon: dataMap,
    title: $t('page.home.dataColletion')
  },
  {
    color: '#006EFF',
    count: 0,
    href: '/ai-assistant/conversational-analysis',
    icon: aiBot,
    title: $t('page.home.aiBot')
  },
  {
    color: '#159906',
    count: 0,
    href: '/ai-assistant/conversational-analysis',
    icon: aiChat,
    title: $t('page.home.aiChat')
  }
];

interface DataAssetsProps {
  agentCount: number;
  chatCount: number;
  dataSetCount: number;
  dataSourceCount: number;
  spaceCount: number;
}

function initDataAssetsConfig(homeData: DataAssetsProps) {
  dataAssetsConfig[0].count = homeData.spaceCount;
  dataAssetsConfig[1].count = homeData.dataSourceCount;
  dataAssetsConfig[2].count = homeData.dataSetCount;
  dataAssetsConfig[3].count = homeData.agentCount;
  dataAssetsConfig[4].count = homeData.chatCount;
}

export function DataAssets({ homeData }: { readonly homeData: DataAssetsProps }) {
  const { push } = useRouter();
  if (homeData) {
    initDataAssetsConfig(homeData);
  }

  return (
    <div className="rd-20px bg-container">
      <AFlex justify="space-between">
        <h1 className="mb4 text-base font-bold">数据资产</h1>
      </AFlex>
      <div className="grid grid-cols-5 gap-4">
        {dataAssetsConfig.map(item => (
          <div
            className="flex flex-col cursor-pointer border border-gray-200 rounded-lg p3 shadow-sm"
            key={item.title}
            style={{ color: item.color }}
            onClick={() => {
              // if (item.href) {
              //   push(item.href);
              // }
            }}
          >
            <div className="flex flex-col text-4 font-bold">{item.title}</div>
            <div className="flex items-center justify-between">
              <div className="mt2 flex flex-col text-5xl">{item.count}</div>
              <img
                alt={item.title}
                className="h-13 w-13"
                src={item.icon}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
