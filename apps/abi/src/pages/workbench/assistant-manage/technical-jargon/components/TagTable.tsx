import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Pagination, Popconfirm, Space, Table, Tooltip } from 'antd';
import React from 'react';

import type { TagGroup } from '../types';

interface TagTableProps {
  readonly dataSource: TagGroup[];
  readonly onDelete: (termId: number) => void;
  readonly onEdit: (group: TagGroup) => void;
}

export const TagTable: React.FC<TagTableProps> = ({ dataSource, onDelete, onEdit }) => {
  const columns = [
    {
      align: 'left',
      dataIndex: 'bizName',
      key: 'bizName',
      title: '中文名',
      width: 120,
      ellipsis: true
    },
    {
      align: 'left',
      dataIndex: 'techName',
      key: 'techName',
      title: '英文名',
      width: 120,
      ellipsis: true
    },
    {
      align: 'left',
      dataIndex: 'termAlias',
      key: 'termAlias',
      title: '别名',
      width: 120,
      ellipsis: true
    },
    {
      align: 'left',
      dataIndex: 'remark',
      key: 'remark',
      title: '业务定义',
      width: 200,
      render: (text?: string) => {
        const val = text || '';
        const truncated = val.length > 10 ? `${val.slice(0, 12)}…` : val;
        return (
          <Tooltip title={val} placement="top">
            <span>{truncated}</span>
          </Tooltip>
        );
      }
    },
    {
      align: 'left',
      dataIndex: 'dataType',
      key: 'dataType',
      title: '数据类型',
      width: 120,
      ellipsis: true
    },
    {
      align: 'left',
      dataIndex: 'measurementUnit',
      key: 'measurementUnit',
      title: '计量单位',
      width: 120,
      ellipsis: true
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'action',
      render: (_: any, record: TagGroup) => (
        <Space size="middle">
          <Tooltip title="编辑">
            <Button
              color="primary"
              icon={<EditOutlined />}
              size="small"
              variant="link"
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            cancelText="取消"
            description="确定要删除吗？"
            okText="确定"
            title="提示"
            onConfirm={() => onDelete(record.termId)}
          >
            <Tooltip title="删除">
              <Button
                color="danger"
                icon={<DeleteOutlined />}
                size="small"
                variant="link"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
      title: '操作',
      width: 150
    }
  ];

  const columnWidth = useMemo(() => {
    return columns.reduce((total, column) => total + (column.width || 0), 0);
  }, [columns]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pagedDataSource = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return dataSource.slice(startIndex, startIndex + pageSize);
  }, [currentPage, dataSource, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dataSource, pageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div
        style={{
          border: '0.0625rem solid #d9d9d9',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          width: '100%'
        }}
      >
        <Table
          columns={columns}
          dataSource={pagedDataSource}
          rowKey="id"
          scroll={pagedDataSource?.length > 0 ? { x: columnWidth } : undefined}
          size="small"
          className="technical-table assistant-table-scroll"
          pagination={false}
        />
      </div>
      <div
        style={{
          padding: '0.75rem 0',
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 'auto'
        }}
      >
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={dataSource.length}
          showSizeChanger
          onChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
        />
      </div>
    </div>
  );
};
