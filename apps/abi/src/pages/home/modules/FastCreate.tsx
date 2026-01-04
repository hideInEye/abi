import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import type { ISpaceItem } from '@/pages/space-list/types';
import { useRouter } from '~/packages/simple-router/src';

/**
 * 快速创建组件
 * 提供系统主要功能的快速访问入口
 * 按照数据处理流程顺序展示创建选项：
 * 1. 我的空间 - 创建数据空间来储存数据资产
 * 2. 数据对接 - 连接各类数据源
 * 3. 数据关联 - 创建数据集并进行数据关联
 * 4. 表语义关联 - 建立表之间的语义关系
 * 5. 智能对话 - 基于数据进行AI对话分析
 * 自动设置默认空间ID，确保用户操作的连续性
 */

// 快速创建功能列表配置
const fastCreateList = [
  {
    description: '创建数据空间储存数据资产',
    title: '我的空间',
    url: '/space-list'
  },
  {
    description: '兼容数据库等类型数据格式',
    title: '数据对接',
    url: '/data-preparation/data-source'
  },
  {
    description: '创建数据集，进行数据关联',
    title: '数据关联',
    url: '/data-preparation/data-collection'
  },
  {
    description: '通过可视化组件组装数据大屏',
    title: '表语义关联',
    url: '/data-preparation/data-table-meaning'
  },
  {
    description: '快速创建数据助手,进行助手关联配置',
    title: '助手管理',
    url: '/assistant-manage/assistant-config'
  },
  {
    description: '根据数据进行智能对话分析',
    title: '智能对话',
    url: '/ai-assistant/conversational-analysis'
  }
];

interface FastCreateProps {
  readonly spaceList: ISpaceItem[];
}

export const FastCreate: React.FC<FastCreateProps> = ({ spaceList }: FastCreateProps) => {
  const { push } = useRouter();

  function handleCreate(url: string) {
    const spaceId = localStorage.getItem('spaceId');
    if (!spaceId && spaceList?.length > 0) {
      localStorage.setItem('spaceId', spaceList[0]?.spaceId.toString());
    }
    push(url);
  }

  return (
    <section>
      <AFlex justify="space-between">
        <h1 className="md:my-[4px] lg:my-[6px] xl:my-[8px] 2xl:my-[12px] text-base font-bold">快速创建</h1>
      </AFlex>
      <ACard className="shadow-sm">
        <section className="flex flex-col gap-[6px]">
          {fastCreateList.map((item, index) => (
            <div
              className={`flex justify-between pb-[8px] last:pb-0 ${index !== fastCreateList.length - 1 ? 'border-b border-gray-100 ' : ''}`}
              key={item.title}
            >
              <div>
                <span>{index + 1}</span>
                <span>、</span>
                <span>{item.title}</span>
                <span className="ml2">( {item.description})</span>
                {/* <QuestionCircleOutlined className="ml2" /> */}
              </div>
              <div
                className="f-v cursor-pointer text-primary"
                onClick={() => handleCreate(item.url)}
              >
                <PlusOutlined />
                <span className="ml1 text-3">快速创建</span>
              </div>
            </div>
          ))}
        </section>
      </ACard>
    </section>
  );
};
