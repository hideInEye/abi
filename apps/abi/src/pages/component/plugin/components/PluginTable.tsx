import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
// import { JsonEditor } from 'json-edit-react';

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
      dataIndex: 'pluginName',
      key: 'pluginName',
      title: '插件名称'
    },
    {
      dataIndex: 'remark',
      key: 'remark',
      title: '插件描述'
    },
    {
      dataIndex: 'pluginType',
      key: 'pluginType',
      title: '插件类型'
    },
    {
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
      title: '插件状态',
    },
    // {
    //   dataIndex: 'parseModeConfig',
    //   key: 'parseModeConfig',
    //   title: '解析配置',
    //   render: (parseModeConfig: string) => {
    //     return (
    //       <JsonEditor
    //         data={parseModeConfig}
    //         enableClipboard={false}
    //         restrictAdd={true}
    //         restrictDelete={true}
    //         restrictEdit={true}
    //       />
    //     );
    //   },
    // },
    // {
    //   dataIndex: 'serviceConfig',
    //   key: 'serviceConfig',
    //   title: '服务配置',
    //   render: (serviceConfig: string) => {
    //     return (
    //       <JsonEditor
    //         data={serviceConfig}
    //         enableClipboard={false}
    //         restrictAdd={true}
    //         restrictDelete={true}
    //         restrictEdit={true}
    //       />
    //     );
    //   },
    // },
    {
      dataIndex: 'action',
      key: 'action',
      render: (_: any, record: any) => {
        return (
          <ASpace>
            <ATooltip title="编辑">
              <AButton
                icon={<EditOutlined />}
                onClick={() => updateCurrentEdit(record)}
              />
            </ATooltip>

            <ATooltip title="删除">
              <AButton
                icon={<DeleteOutlined />}
                onClick={() => {
                  AModal.confirm({
                    onOk: () => {
                      deletePlugin(record);
                    },
                    title: '确定删除该插件吗？'
                  });
                }}
              />
            </ATooltip>
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
    <ATable
      columns={columns}
      dataSource={dataSource.rows}
      pagination={{
        current,
        onChange: handleChange,
        total: dataSource.total
      }}
      style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}
    />
  );
};
