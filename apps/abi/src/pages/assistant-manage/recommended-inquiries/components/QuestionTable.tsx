import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Table } from 'antd';
import React from 'react';

import type { QuestionTableData } from '../types';
import { useQuestionManagement } from '../hooks/useQuestionManagement';

interface IQuestionTable {
  readonly dataSource: QuestionTableData[];
  readonly onDelete: (id: number) => void;
  readonly onEdit: (group: QuestionTableData) => void;
}

export const QuestionTable: React.FC<IQuestionTable> = ({ dataSource, onDelete, onEdit }) => {
  const {setPagination ,pagination, searchValue, getTableData} = useQuestionManagement()
  useEffect(()=>{
    getTableData(searchValue)
  },[pagination.pageNum])
  const columns = [
    {
      dataIndex: 'question',
      key: 'question',
      title: '问题'
    },

    {
      key: 'action',
      render: (_: any, record: QuestionTableData) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            type="text"
            onClick={() => onEdit(record)}
          />
          {/* <Button
            icon={<CopyOutlined />}
            type="text"
          /> */}
          <Popconfirm
            cancelText="取消"
            description="确定要删除吗？"
            okText="确定"
            title="提示"
            onConfirm={() => onDelete(record.problemId)}
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
  );
};
