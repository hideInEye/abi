import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Tooltip } from 'antd';
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
      dataIndex: 'bizName',
      key: 'bizName',
      title: '中文名',
      width: 120,
      ellipsis: true
    },
    {
      dataIndex: 'techName',
      key: 'techName',
      title: '英文名',
      width: 120,
      ellipsis: true
    },
    {
      dataIndex: 'termAlias',
      key: 'termAlias',
      title: '别名',
      width: 120,
      ellipsis: true
    },
    {
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
      dataIndex: 'dataType',
      key: 'dataType',
      title: '数据类型',
      width: 120,
      ellipsis: true
    },
    {
      dataIndex: 'measurementUnit',
      key: 'measurementUnit',
      title: '计量单位',
      width: 120,
      ellipsis: true
    },
    {
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

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
      scroll={{ x: columnWidth }}
      size="small"
    />
  );
};
