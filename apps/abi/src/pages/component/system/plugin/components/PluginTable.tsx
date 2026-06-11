import { DownOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
// import { JsonEditor } from 'json-edit-react';
import { Dropdown } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';
import type { PluginItem, PluginList } from '@/types/plug';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

interface PluginTableProps {
  readonly current: number;
  readonly dataSource: {
    code: number;
    msg: string;
    rows: any[];
    total: number;
  };
  readonly deletePlugin: (data: PluginList) => void;
  readonly setcurrent: (current: number) => void;
  readonly updateCurrentEdit: (currentEdit: PluginItem) => void;
  readonly updateStatus: (record: PluginItem) => void;
  readonly onDetail?: (record: PluginItem) => void;
}

export const PluginTable: React.FC<PluginTableProps> = ({
  current,
  dataSource,
  deletePlugin,
  setcurrent,
  updateCurrentEdit,
  updateStatus,
  onDetail
}: PluginTableProps) => {
  const spaceId = useAppSelector(getSpaceId);
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const columns: ColumnsType<PluginItem> = [
    {
      align: 'center',
      dataIndex: 'pluginName',
      key: 'pluginName',
      minWidth: 140,
      title: 'MCP服务名称'
    },
    {
      align: 'center',
      dataIndex: 'remark',
      key: 'remark',
      minWidth: 140,
      title: '描述'
    },
    {
      align: 'center',
      dataIndex: 'capabilities',
      key: 'capabilities',
      minWidth: 120,
      title: '支持能力',
      render: (_: unknown, record: PluginItem) => {
        const caps = record.capabilities ?? [];
        if (!caps.length) return '--';
        return (
          <ASpace size={4} wrap>
            {caps.map(item => (
              <ATag color="blue" key={item}>{item}</ATag>
            ))}
          </ASpace>
        );
      }
    },
    {
      align: 'center',
      dataIndex: 'pluginType',
      key: 'pluginType',
      minWidth: 100,
      title: '类型',
      render: (_: unknown, record: PluginItem) => {
        const isHttp = record.protocol === 'http' || record.protocol === 'https';
        return (
          <ASpace size={6}>
            <span>{record.pluginType || '--'}</span>
            {isHttp && <ATag color="green">转换服务</ATag>}
          </ASpace>
        );
      }
    },
    {
      align: 'center',
      dataIndex: 'version',
      key: 'version',
      minWidth: 80,
      title: '版本',
      render: (_: unknown, record: PluginItem) => record?.versionDetail?.version || '--'
    },
    {
      align: 'center',
      dataIndex: 'status',
      key: 'status',
      minWidth: 80,
      render: (status: number, record: PluginItem) => {
        return (
          <ASwitch
            checked={status === 1}
            onChange={() => updateStatus(record)}
          />
        );
      },
      title: '状态'
    },
    {
      align: 'center',
      fixed: 'right',
      dataIndex: 'action',
      key: 'action',
      render: (_: any, record: any) => {
        return (
          <div className="flex items-center gap-12px">
            <AButton color="primary" size="small" variant="link" onClick={() => onDetail?.(record)}>详情</AButton>
            <AButton color="primary" size="small" variant="link" onClick={() => updateCurrentEdit(record)}>编辑</AButton>
            <AButton
              color="primary"
              size="small"
              variant="link"
              onClick={() => setAnalysisContext({ nodeId: record.pluginId, nodeName: record.pluginName, nodeType: 'MCP', spaceId: spaceId || undefined })}
            >
              元数据分析
            </AButton>
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'delete',
                    danger: true,
                    label: (
                      <APopconfirm title="提示" description="确定删除该MCP服务吗？" onConfirm={() => deletePlugin(record)}>
                        <span>删除</span>
                      </APopconfirm>
                    ),
                  },
                ],
              }}
            >
              <AButton color="primary" size="small" variant="link">更多 <DownOutlined style={{ fontSize: '0.625rem' }} /></AButton>
            </Dropdown>
          </div>
        );
      },
      title: '操作'
    }
  ];

  const [jumpValue, setJumpValue] = useState('');
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(dataSource.total / pageSize));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {dataSource.rows.length > 0 ? (
        <div style={{ border: '1px solid rgba(130,140,200,0.18)', borderRadius: '12px', overflow: 'hidden' }}>
          <ATable
            columns={columns}
            dataSource={dataSource.rows}
            pagination={false}
            style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontFamily: 'PingFangSC, PingFang SC', fontWeight: 400, fontSize: '0.875rem', color: '#333333' }}
            size="middle"
            className="plugin-table abi-std-table"
          />
        </div>
      ) : (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(130,140,200,0.18)',
          borderRadius: '12px',
          background: '#F5F7FF',
        }}>
          <AEmpty description="暂无数据" />
        </div>
      )}
      <div className="data-source-pagination">
        <span className="total-text">共 {dataSource.total} 条</span>
        <div className="pagination-controls">
          <ASelect
            value={pageSize}
            options={[
              { label: '10条/页', value: 10 },
            ]}
            disabled
            className="page-size-select"
          />
          <button className="page-btn" disabled={current === 1} onClick={() => setcurrent(current - 1)}>
            <LeftOutlined />
          </button>
          {(() => {
            const pages: number[] = [];
            if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
            else {
              pages.push(1);
              if (current > 3) pages.push(-1);
              const start = Math.max(2, current - 1);
              const end = Math.min(totalPages - 1, current + 1);
              for (let i = start; i <= end; i++) pages.push(i);
              if (current < totalPages - 2) pages.push(-2);
              pages.push(totalPages);
            }
            return pages.map(p => p < 0 ? <span key={p} className="page-item page-ellipsis">...</span> : <span key={p} className={`page-item${p === current ? ' page-active' : ''}`} onClick={() => setcurrent(p)}>{p}</span>);
          })()}
          <button className="page-btn" disabled={current >= totalPages} onClick={() => setcurrent(current + 1)}>
            <RightOutlined />
          </button>
          <span className="quick-jumper">
            前往
            <AInput className="jump-input" style={{ width: 48, textAlign: 'center' }} value={jumpValue} onChange={(e: any) => setJumpValue(e.target.value)} onPressEnter={() => { const p = parseInt(jumpValue, 10); if (p >= 1 && p <= totalPages) setcurrent(p); setJumpValue(''); }} />
            页
          </span>
        </div>
      </div>
      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  );
};
