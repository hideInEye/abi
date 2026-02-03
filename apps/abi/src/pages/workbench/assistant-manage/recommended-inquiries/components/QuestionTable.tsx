import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table } from 'antd';
import React from 'react';

import type { QuestionTableData } from '../types';
import { useQuestionManagement } from '../hooks/useQuestionManagement';

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
      dataIndex: 'question',
      key: 'question',
      title: '问题'
    },

    {
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
  console.log(pagination);
  
  return (
  <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px' }}>
    <Table
      columns={columns}
      dataSource={dataSource}
      rowKey="id"
      scroll={{y: 360 }}
      size="small"
      className="question-table"
      pagination={{
        onChange:(p,n)=>{
          setPagination({
            ...pagination,
            pageNum: p,
            pageSize: n
          })
        },
        ...pagination
      }}
    />
  </div>
  );
};
