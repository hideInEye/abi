import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table } from 'antd';
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
      dataIndex: 'techName',
      key: 'techName',
      title: '中文名'
    },
    {
      dataIndex: 'termAlias',
      key: 'termAlias',
      title: '别名'
    },
    {
      dataIndex: 'bizName',
      key: 'bizName',
      title: '业务定义'
    },
    {
      dataIndex: 'dataType',
      key: 'dataType',
      title: '数据类型'
    },
    {
      dataIndex: 'measurementUnit',
      key: 'measurementUnit',
      title: '计量单位'
    },
    {
      key: 'action',
      render: (_: any, record: TagGroup) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            type="text"
            onClick={() => onEdit(record)}
          />
          <Popconfirm
            cancelText="取消"
            description="确定要删除吗？"
            okText="确定"
            title="提示"
            onConfirm={() => onDelete(record.termId)}
          >
            <Button
              icon={<DeleteOutlined />}
              type="text"
            />
          </Popconfirm>
        </Space>
      ),
      title: '操作'
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
    />
  );
};
