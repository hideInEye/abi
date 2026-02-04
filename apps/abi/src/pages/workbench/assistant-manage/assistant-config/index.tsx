import { CloudSyncOutlined, DeleteOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons';

// import { enableStatusRecord } from '@/constants/business';
// import { ATG_MAP } from '@/constants/common';
import { message } from 'antd';

import {
  delAgentConfigDs,
  fetchAssistantConfigList,
  fetchCheckBeforeDelete,
  fetchDeleteAgent,
  syncKnowledgeBase,
  fetchTerms,
  getAgentDetailById,
  putAgentConfig,
} from '@/service/api/assistant-manage';

import DatasourceConfigDrawer from './modules/assistant-config-drawer';
import DatasourceOperateDrawer from './modules/assistant-operate-drawer';
import KeySearch from './modules/key-search';

/**
 * AI 助手配置管理页面
 * 提供助手的创建、编辑、删除、配置和知识库同步功能
 * 包含助手列表展示、搜索过滤、批量操作等功能
 */

// const DatasourceOperateDrawer = lazy(() => import('./modules/assistant-operate-drawer'));
// const DatasourceConfigDrawer = lazy(() => import('./modules/assistant-config-drawer'));
export function Component() {
  const { t } = useTranslation();
  const [selectedAgentId, setSelectedAgentId] = useState<number>();
  const [editVisible, setEditVisible] = useState(false);
  const [configVisible, setConfigVisible] = useState(false);

  const [searchValue, setSearchValue] = useState('');

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps } = useTable({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    apiFn: fetchAssistantConfigList,
    apiParams: {
      bizName: searchValue,
      pageNum: 1,
      pageSize: 10,
      spaceId: Number(localStorage.getItem('spaceId')) // 空间id
    } as any,
    columns: () => [
      {
        align: 'center',
        dataIndex: 'bizName',
        key: 'bizName',
        minWidth: 120,
        title: '助手名称'
      },
      {
        align: 'center',
        dataIndex: 'techName',
        key: 'techName',
        minWidth: 120,
        title: '英文名'
      },
      {
        align: 'center',
        dataIndex: 'remark',
        key: 'remark',
        minWidth: 120,
        title: '描述'
      },
      {
        align: 'center',
        dataIndex: 'createBy',
        key: 'createBy',
        title: t('page.dataPreparation.dataSource.creator'),
        width: 100
      },
      {
        align: 'center',
        dataIndex: 'createTime',
        key: 'createTime',
        minWidth: 120,
        title: t('page.dataPreparation.dataSource.createTime')
      },
      {
        align: 'center',
        dataIndex: 'updateBy',
        key: 'updateBy',
        minWidth: 120,
        title: t('page.dataPreparation.dataSource.operator')
      },
      {
        align: 'center',
        dataIndex: 'updateTime',
        key: 'updateTime',
        minWidth: 120,
        title: t('page.dataPreparation.dataSource.operateTime')
      },
      {
        align: 'center',
        key: 'operate',
        render: (_: unknown, record: any) => (
          <div className="flex-center gap-8px">
            <ATooltip title="编辑助手">
              <AButton
                color="primary"
                icon={<EditOutlined style={{ fontSize: '1rem' }} />}
                size="small"
                variant="link"
                onClick={() => {
                  setEditVisible(true);
                  setSelectedAgentId(record.agentId);
                }}
              />
            </ATooltip>
            <ATooltip title="助手设置">
              <AButton
                color="primary"
                icon={<FileTextOutlined style={{ fontSize: '1rem' }} />}
                size="small"
                variant="link"
                onClick={() => {
                  setConfigVisible(true);
                  setSelectedAgentId(record.agentId);
                }}
              />
            </ATooltip>
            <APopconfirm
              cancelText="取消"
              description="确定要同步知识库吗？"
              okText="确定"
              title="提示"
              onConfirm={() => handleConfirm(record)}
            >
              <ATooltip title="同步知识库">
                <AButton
                  color="primary"
                  icon={<CloudSyncOutlined style={{ fontSize: '1rem' }} />}
                  size="small"
                  variant="link"
                />
              </ATooltip>
            </APopconfirm>
            <APopconfirm
              title={t('common.confirmDelete')}
              onConfirm={() => handleDelete(record)}
            >
              <ATooltip title="删除助手">
                <AButton
                  color="danger"
                  icon={<DeleteOutlined style={{ fontSize: '1rem' }} />}
                  size="small"
                  variant="link"
                />
              </ATooltip>
            </APopconfirm>
          </div>
        ),
        title: t('common.operate'),
        width: 195
      }
    ]
  });

  const { checkedRowKeys, onDeleted, rowSelection } = useTableOperate(data as any, run, () => {});

  async function handleDelete(record: any) {
    // 删除助手取消调用此接口，不需要判断是否引用对话
    // const checkRes = await fetchCheckBeforeDelete({ agent_id: record.agentId });
    // if (checkRes.response.data.code === 601) {
    //   message.error(checkRes.response.data.msg);
    //   return;
    // }
    const res = await fetchDeleteAgent({
      agent_id: record.agentId,
      space_id: `${record.spaceId}`,
    });

    if (res.response.data.success) {
      const rel = await delAgentConfigDs(record.agentId);
      if (rel.response.data.code === 200) {
        onDeleted();
      }
    } else {
      message.error(res.response.data.err_msg);
    }
  }

  async function handleConfirm(record: any) {
    // 1. 先获取助手详情并更新配置
    const detailRes = await getAgentDetailById(record.agentId);
    const detailData = detailRes?.data;
    if (detailData) {
      await putAgentConfig({
        ...detailData,
        spaceId: Number(localStorage.getItem('spaceId')),
        status: 1,
      });
    }
    // 2. 同步知识库
    const obj = JSON.parse(record.modelConfig || '{}');
    const cfg = obj?.modelConfigs?.[0] || {};
    let dslObj = obj?.mdlConfigs || {};
    try {
      const termGroupId = cfg?.termGroupId;
      if (termGroupId) {
        const termRes = await fetchTerms({ groupId: termGroupId, spaceId: Number(record.spaceId), termName: '' });
        const termMap: Record<string, string> = {};
        (termRes?.data || []).forEach((it: any) => {
          if (it?.techName) termMap[it.techName] = it.bizName;
          if (it?.engName) termMap[it.engName] = it.bizName;
        });
        const rewrite = (node: any) => {
          if (!node || typeof node !== 'object') return;
          if (typeof node.displayName === 'string') {
            const v = termMap[node.displayName];
            if (v) node.displayName = v;
          }
          Object.keys(node).forEach(k => rewrite(node[k]));
        };
        rewrite(dslObj);
      }
    } catch (e) {}
    // console.log('KB sync DSL:', dslObj);
    const res = await syncKnowledgeBase({
      agent_id: `${record.agentId}`,
      dsl: JSON.stringify(dslObj || {}),
      space_id: `${record.spaceId}`
    });
    if (res.response.data?.success) {
      message.success('同步成功');
    } else {
      message.error(res.response.data?.err_msg);
    }
  }

  const handleAdd = () => {
    setEditVisible(true);
  };

  const onClose = (refresh?: boolean) => {
    if (refresh) {
      run();
    }
    setSelectedAgentId(undefined);
    setEditVisible(false);
    setConfigVisible(false);
  };

  const handleSearch = () => {
    run();
  };

  return (
    <div
      className="flex flex-col gap-4 p-6"
      style={{ height: 'calc(100vh - 3rem)', minHeight: 0, overflow: 'hidden' }}
    >
      <div className="flex items-center gap-4">
        <AInput
          placeholder="请输入助手名称"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: '12.5rem' }}
        />
        <AButton type="primary" onClick={() => handleAdd()}>
          新增助手
        </AButton>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            border: '0.0625rem solid #d9d9d9',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            width: '100%',
            maxHeight: '100%'
          }}
        >
          <div style={{ overflow: 'auto', maxHeight: '100%' }}>
            <ATable
              columns={tableProps.columns as any}
              dataSource={tableProps.dataSource}
              loading={tableProps.loading}
              pagination={false}
              rowKey="agentId"
              rowSelection={rowSelection as any}
              scroll={{ x: 'max-content' }}
              size="small"
              className="assistant-config-table"
            />
          </div>
        </div>

        <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
          <APagination {...tableProps.pagination} showSizeChanger />
        </div>
      </div>

      {editVisible ? (
        <DatasourceOperateDrawer
          agentId={selectedAgentId}
          syncKnowledgeBase={handleConfirm}
          onClose={onClose}
        />
      ) : null}
      {configVisible ? (
        <DatasourceConfigDrawer
          agentId={selectedAgentId}
          onClose={onClose}
        />
      ) : null}
    </div>
  );
}
