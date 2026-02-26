import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
// import { JsonEditor } from 'json-edit-react';
import { Pagination } from 'antd';

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
}

export const PluginTable: React.FC<PluginTableProps> = ({
  current,
  dataSource,
  deletePlugin,
  setcurrent,
  updateCurrentEdit,
  updateStatus
}: PluginTableProps) => {
  const columns = [
    {
      align: 'left',
      dataIndex: 'pluginName',
      key: 'pluginName',
      title: '插件名称'
    },
    {
      align: 'left',
      dataIndex: 'remark',
      key: 'remark',
      title: '插件描述'
    },
    {
    align: 'left',
      dataIndex: 'pluginType',
      key: 'pluginType',
      title: '插件类型'
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
      title: '插件状态'
    },
    {
      align: 'center',
      fixed: 'right',
      dataIndex: 'action',
      key: 'action',
      render: (_: any, record: any) => {
        return (
          <ASpace>
            <ATooltip title="编辑">
              <AButton
                color="primary"
                icon={<EditOutlined />}
                size="small"
                variant="link"
                onClick={() => updateCurrentEdit(record)}
              />
            </ATooltip>

            <APopconfirm
              title="提示"
              description="确定删除该插件吗？"
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
    </div>
  );
};
