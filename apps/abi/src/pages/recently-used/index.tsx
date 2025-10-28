import { DeleteOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';

import { deleteOperateRecord, queryOperateRecordList } from '@/service/api/operateRecord';

interface OperateRecord {
  readonly id: string;
}

interface Response {
  code: number;
  msg: string;
  rows: any[];
  total: number;
}

export const Component: React.FC & { loader?: () => Promise<any> } = () => {
  const [dataSource, setDataSource] = useState<Response>({
    code: 0,
    msg: '',
    rows: [],
    total: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function getRecordList(key?: string) {
    const data = await queryOperateRecordList({
      key,
      pageNum: currentPage,
      pageSize,
      type: 1
    });
    setDataSource(data.response.data);
  }

  function onSearchChange(e: any) {
    const key = e.target.value;
    setCurrentPage(1);
    setDataSource({
      code: 0,
      msg: '',
      rows: [],
      total: 0
    });
    getRecordList(key);
  }

  useEffect(() => {
    getRecordList();
  }, []);

  function paginationChange(page: number) {
    setCurrentPage(page);
    getRecordList();
  }

  function deleteOperateRecordItem(ids: string) {
    deleteOperateRecord(ids).then(res => {
      setDataSource(res.data);
    });
  }

  const ActionButtons: React.FC<{ readonly record: OperateRecord }> = ({ record }) => (
    <ASpace>
      <ATooltip title="删除">
        <AButton
          icon={<DeleteOutlined />}
          onClick={() => deleteOperateRecordItem(record.id)}
        />
      </ATooltip>
    </ASpace>
  );

  const columns = [
    {
      dataIndex: 'name',
      key: 'name',
      title: '名称'
    },
    {
      dataIndex: 'status',
      key: 'status',
      title: '状态'
    },
    {
      dataIndex: 'type',
      key: 'type',
      title: '类型'
    },
    {
      dataIndex: 'creator',
      key: 'creator',
      title: '创建人'
    },
    {
      dataIndex: 'createTime',
      key: 'createTime',
      title: '创建时间'
    },
    {
      dataIndex: 'operator',
      key: 'operator',
      title: '操作人'
    },
    {
      dataIndex: 'operateTime',
      key: 'operateTime',
      title: '操作时间'
    },
    {
      dataIndex: 'invalid',
      key: 'invalid',
      title: '失效时间'
    },
    {
      dataIndex: 'action',
      key: 'action',
      render: (_: any, record: OperateRecord) => <ActionButtons record={record} />,
      title: '操作'
    }
  ];

  return (
    <ACard>
      <ASpace className="flex justify-between">
        <h1 className="mb-4 text-base font-medium">最近使用</h1>
        <AInput
          className="flex-1"
          placeholder="搜索"
          onChange={onSearchChange}
        />
      </ASpace>

      <ATable
        columns={columns}
        dataSource={dataSource.rows}
        pagination={{
          current: currentPage,
          onChange: paginationChange,
          total: dataSource.total
        }}
      />
    </ACard>
  );
};
