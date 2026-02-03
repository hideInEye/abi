import { DeleteOutlined, EditOutlined, SnippetsOutlined } from '@ant-design/icons';

import type { DictionaryItem } from '../types';

interface TableDictionaryProps {
  readonly current: number;
  readonly dataSource: {
    code: number;
    msg: string;
    rows: any[];
    total: number;
  };
  readonly onDelete: (id: number) => void;
  readonly onDiff: (record: DictionaryItem) => void;
  readonly onEdit: (record: DictionaryItem) => void;
  readonly onPageChange: (page: number) => void;
  readonly onStatusChange: (record: DictionaryItem) => void;
}

export const TableDictionary: React.FC<TableDictionaryProps> = ({
  current,
  dataSource,
  onDelete,
  onDiff,
  onEdit,
  onPageChange,
  onStatusChange
}: TableDictionaryProps) => {
  const handleEdit = (record: DictionaryItem) => {
    onEdit(record);
  };
  const handleDelete = (record: DictionaryItem) => {
    onDelete(record.dictId);
  };

  const handlePageChange = (page: number) => {
    onPageChange(page);
  };

  const handleDiff = (record: DictionaryItem) => {
    onDiff(record);
  };

  const handleStatusChange = (record: DictionaryItem) => {
    onStatusChange(record);
  };

  const columns = [
    // {
    //   dataIndex: 'dictId',
    //   title: '字典ID'
    // },
    {
      dataIndex: 'dictField',
      title: '字典名称'
    },
    {
      dataIndex: 'dictName',
      title: '中文名称'
    },
    {
      dataIndex: 'status',
      render: (text: string, record: DictionaryItem) => {
        return (
          <ASwitch
            checked={text === '2'}
            onChange={() => handleStatusChange(record)}
          />
        );
      },
      title: '状态'
    },
    {
      dataIndex: 'remark',
      title: '字典描述',
      width: 120,
      render: (text: string) => {
        if (!text) return '';
        if (text.length > 15) {
          return (
            <ATooltip title={text}>
              <span>{text.slice(0, 15)}...</span>
            </ATooltip>
          );
        }
        return <span>{text}</span>;
      }
    },
    {
      dataIndex: 'createTime',
      title: '创建时间'
    },

    {
      dataIndex: '操作',
      render: (_: any, record: DictionaryItem) => {
        return (
          <div className="flex items-center gap-2">
            <AButton
              color="primary"
              icon={<EditOutlined />}
              size="small"
              variant="link"
              onClick={() => handleEdit(record)}
            />

            <AButton
              color="primary"
              icon={<SnippetsOutlined />}
              size="small"
              variant="link"
              onClick={() => handleDiff(record)}
            />
            <APopconfirm
              cancelText="取消"
              description="确定要删除该字典吗？"
              okText="确认"
              title="删除字典"
              onConfirm={() => handleDelete(record)}
            >
              <AButton
                color="danger"
                icon={<DeleteOutlined />}
                size="small"
                variant="link"
              />
            </APopconfirm>
          </div>
        );
      },
      title: '操作'
    }
  ];

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px' }}>
      <ATable
        columns={columns}
        dataSource={dataSource.rows}
        pagination={{
          current,
          onChange: handlePageChange,
          pageSize: 10,
          total: dataSource.total
        }}
        scroll={{ x: 'max-content', y: 'calc(100vh - 350px)' }}
        size="small"
        className="dictionary-table"
      />
    </div>
  );
};
