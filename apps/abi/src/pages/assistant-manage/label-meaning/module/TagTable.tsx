import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table } from 'antd';
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
      title: '中文名'
    },
    {
      dataIndex: 'engName',
      key: 'engName',
      title: '英文名'
    },
    {
      dataIndex: 'tagType',
      key: 'tagType',
      render: (tagType: string) => {
        return tabTypeOptions.find(item => item.value === tagType)?.label;
      },
      title: '标签类型'
    },

    {
      dataIndex: 'alias',
      key: 'alias',
      title: '别名'
    },

    {
      dataIndex: 'remark',
      key: 'remark',
      title: '文本定义'
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
            onConfirm={() => onDelete(record.tagId)}
          >
            <Button
              icon={<DeleteOutlined />}
              type="text"
            />
          </Popconfirm>
        </Space>
      ),
      title: '操作',
      width: 150
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
