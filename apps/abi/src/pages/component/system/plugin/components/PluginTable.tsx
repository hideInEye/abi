import { ApartmentOutlined, DeleteOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
// import { JsonEditor } from 'json-edit-react';
import { Pagination } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer';
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types';
import type { PluginItem, PluginList } from '@/types/plug';

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
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null);
  const columns: ColumnsType<PluginItem> = [
    {
      align: 'left',
      dataIndex: 'pluginName',
      key: 'pluginName',
      title: 'MCP服务名称'
    },
    {
      align: 'left',
      dataIndex: 'remark',
      key: 'remark',
      title: '描述'
    },
    {
      align: 'left',
      dataIndex: 'capabilities',
      key: 'capabilities',
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
    align: 'left',
      dataIndex: 'pluginType',
      key: 'pluginType',
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
      align: 'left',
      dataIndex: 'version',
      key: 'version',
      title: '版本',
      render: (_: unknown, record: PluginItem) => record?.versionDetail?.version || '--'
    },
    {
      align: 'center',
      dataIndex: 'status',
      key: 'status',
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
          <ASpace>
            <ATooltip title="详情">
              <AButton
                color="primary"
                icon={<EyeOutlined />}
                size="small"
                variant="link"
                onClick={() => onDetail?.(record)}
              />
            </ATooltip>
            <ATooltip title="编辑">
              <AButton
                color="primary"
                icon={<EditOutlined />}
                size="small"
                variant="link"
                onClick={() => updateCurrentEdit(record)}
              />
            </ATooltip>
            <ATooltip title="查看元数据分析">
              <AButton
                color="primary"
                icon={<ApartmentOutlined />}
                size="small"
                variant="link"
                onClick={() =>
                  setAnalysisContext({
                    nodeId: record.pluginId,
                    nodeName: record.pluginName,
                    nodeType: 'MCP',
                    spaceId: Number(localStorage.getItem('spaceId')) || undefined
                  })
                }
              />
            </ATooltip>

            <APopconfirm
              title="提示"
              description="确定删除该MCP服务吗？"
              onConfirm={() => deletePlugin(record)}
            >
            <ATooltip title="删除">
              <AButton
                icon={<DeleteOutlined />}
                color="danger"
                size="small"
                variant="link"
              />
            </ATooltip>
          </APopconfirm>
          </ASpace>
        );
      },
      title: '操作'
    }
  ];

  const handleChange = (page: number) => {
    setcurrent(page);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', overflow: 'hidden' }}>
        <ATable
          columns={columns}
          dataSource={dataSource.rows}
          pagination={false}
          style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', fontFamily: 'PingFangSC, PingFang SC', fontWeight: 400, fontSize: '0.875rem', color: '#333333' }}
          size="small"
          className="plugin-table"
        />
      </div>
      <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
        <Pagination
          current={current}
          pageSize={10}
          total={dataSource.total}
          onChange={(page) => handleChange(page)}
        />
      </div>
      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  );
};
