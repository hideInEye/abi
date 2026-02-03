import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Tooltip } from 'antd';
import React from 'react';

import { tabTypeOptions } from '../constants';
import type { TagGroup } from '../types';

interface TagTableProps {
  readonly dataSource: TagGroup[];
  readonly onDelete: (tagId: number) => void;
  readonly onEdit: (group: TagGroup) => void;
}

export const TagTable: React.FC<TagTableProps> = ({ dataSource, onDelete, onEdit }) => {
  const columns = [
    {
      dataIndex: 'tagName',
      key: 'tagName',
      title: '中文名',
      width: 120,
      ellipsis: true
    },
    {
      dataIndex: 'engName',
      key: 'engName',
      title: '英文名',
      width: 120,
      ellipsis: true
    },
    {
      dataIndex: 'tagType',
      key: 'tagType',
      render: (tagType: string) => {
        return tabTypeOptions.find(item => item.value === tagType)?.label;
      },
      title: '标准类型',
      width: 100,
      ellipsis: true
    },
    {
      dataIndex: 'alias',
      key: 'alias',
      title: '别名',
      width: 120,
      ellipsis: true
    },
    {
      dataIndex: 'remark',
      key: 'remark',
      title: '文本定义',
      width: 200,
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
            onConfirm={() => onDelete(record.tagId)}
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
    return columns.reduce((total, column) => total + (column.width || 100), 0);
  }, [columns]);

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px' }}>
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
      scroll={ {x: columnWidth, y:'max-content'} }
      size="small"
      className="tag-table"
    />
    </div>
  );
};
