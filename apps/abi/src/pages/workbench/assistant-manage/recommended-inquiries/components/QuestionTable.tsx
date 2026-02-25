import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Pagination, Popconfirm, Space, Table } from 'antd';
import React from 'react';

import type { QuestionTableData } from '../types';

interface IQuestionTable {
  readonly dataSource: QuestionTableData[];
  readonly onDelete: (id: number) => void;
  readonly onEdit: (group: QuestionTableData) => void;
  pagination:any;
  setPagination: any;
}

export const QuestionTable: React.FC<IQuestionTable> = ({ dataSource, onDelete, onEdit, pagination, setPagination }) => {


  const columns = [
    {
      align: 'left',
      dataIndex: 'question',
      key: 'question',
      title: '问题'
    },
    {
      align: 'center',
      key: 'action',
      width:150,
      render: (_: any, record: QuestionTableData) => (
        <Space>
          <Button
            color="primary"
            icon={<EditOutlined />}
            size="small"
            variant="link"
            onClick={() => onEdit(record)}
          />
          <Popconfirm
            cancelText="取消"
            description="确定要删除吗？"
            okText="确定"
            title="提示"
            onConfirm={() => onDelete(record.problemId)}
          >
            <Button
              color="danger"
              icon={<DeleteOutlined />}
              size="small"
              variant="link"
            />
          </Popconfirm>
        </Space>
      ),
      title: '操作'
    }
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          size="small"
          className="question-table"
          pagination={false}
        />
      </div>
      <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
        <Pagination
          current={pagination?.pageNum}
          pageSize={pagination?.pageSize}
          total={pagination?.total}
          showSizeChanger
          onChange={(page, size) => {
            setPagination({
              ...pagination,
              pageNum: page,
              pageSize: size
            });
          }}
        />
      </div>
    </div>
  );
};
