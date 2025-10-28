import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';

import type { ISpaceItem } from '@/pages/space-list/types';
import { useRouter } from '~/packages/simple-router/src';
import { Tooltip } from 'antd';

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
    url: '/space-list',
    tooltip:"空间为您提供独立的数据工作台，实现不同项目间的数据隔离。在每个空间内，您可独立完成从数据源连接、数据集构建到智能对话分析的全套流程，保障项目数据私密与操作流畅。"
  },
  {
    description: '兼容数据库等类型数据格式',
    title: '数据对接',
    url: '/data-preparation/data-source',
    tooltip:"数据源是连接各类数据库的统一模块，支持MySQL、Oracle等多种数据库类型的便捷接入。它负责建立和管理数据库链接，为后续的数据处理与分析提供稳定、多样的数据供应。"
  },
  {
    description: '创建数据集，进行数据关联',
    title: '数据关联',
    url: '/data-preparation/data-collection',
    tooltip:"数据集支持通过两种模式快速创建，旨在将分散的数据表及其关联关系直观地构建起来，形成易于理解的业务数据模型，为分析查询奠定基础。"
  },
  {
    description: '通过可视化组件组装数据大屏',
    title: '表语义关联',
    url: '/data-preparation/data-collection',
    tooltip:"表语义化功能将数据库中的技术性表名字段名，映射为“销售额”、“部门”等业务人员熟悉的术语。屏蔽了技术复杂性，让用户能用业务语言直接与数据对话，提升分析效率。"
  },
  {
    description: '根据数据进行智能对话分析',
    title: '智能对话',
    url: '/ai-assistant/conversational-analysis',
    tooltip:"用户与智能数据分析系统交互的核心界面，采用类似聊天软件的直观设计，让业务人员能够通过自然语言提问的方式快速获取数据洞察。"
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
    <section className="mt10">
      <AFlex justify="space-between">
        <h1 className="mb4 text-base font-bold">快速创建</h1>
      </AFlex>
      <ACard className="shadow-sm">
        <section className="flex flex-col gap-5">
          {fastCreateList.map((item, index) => (
            <div
              className={`flex justify-between pb2 ${index !== fastCreateList.length - 1 ? 'border-b border-gray-100 ' : ''}`}
              key={item.title}
            >
              <div>
                <span>{index + 1}</span>
                <span>、</span>
                <span>{item.title}</span>
                <span className="ml2">( {item.description})</span>
               <Tooltip title={item.tooltip}><QuestionCircleOutlined className="ml2" /></Tooltip>
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
