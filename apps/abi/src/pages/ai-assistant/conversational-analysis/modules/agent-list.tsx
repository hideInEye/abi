import { FileTextOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';
import { Table } from 'antd';
import React, { useEffect, useReducer, useState } from 'react';

import { SPACE_ID } from '@/constants/chat';
import { fetchAgentList } from '@/service/api/app';

import AgentInfoModal from './agent-info-modal';

/**
 * AI 助手列表组件
 * 展示可用的 AI 助手列表，支持选择和查看详情
 * 包含分页、单选功能
 */
interface PropsType {
  setAgentId: (id: number) => void; // 选中助手时的回调
}

const initVal = {
  pageNum: 1,
  pageSize: 20,
  total: 0
};

const reducer = (state: any, field: any) => {
  return {
    ...state,
    ...field
  };
};

const AgentList: React.FC<PropsType> = memo(({ setAgentId }) => {
  const [pagination, dispatch] = useReducer(reducer, initVal);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [selectedRow, setSelectedRow] = useState<any>({});
  const [viewRowAgentId, setViewRowAgentId] = useState<number>();
  const columns = [
    {
      dataIndex: 'bizName',
      key: 'bizName',
      title: '数据模型'
    },
    {
      dataIndex: 'remark',
      key: 'remark',
      title: '描述'
    },
    {
      dataIndex: 'createTime',
      key: 'createTime',
      title: '创建时间'
    },
    {
      key: 'act',
      render: (_: unknown, record: any) => {
        return <FileTextOutlined onClick={() => setViewRowAgentId(record.agentId)} />;
      },
      title: '操作'
    }
  ];

  const getAgentList = async () => {
    const res: any = await fetchAgentList({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      spaceId: Number(localStorage.getItem('spaceId'))
    });

    setDataSource(res.data);
    dispatch(res.total);
  };

  useEffect(() => {
    getAgentList();
  }, [pagination.pageNum, pagination.pageSize]);

  const rowSelection: TableProps<any>['rowSelection'] = {
    onChange: (keys: React.Key[], selectedRows: any[]) => {
      setAgentId(keys?.[0] as number);
      setSelectedRow(selectedRows[0]);
    }
  };
  return (
    <div>
      <header className="pb-2 pt-4">
        <b>已选择：{selectedRow.agentAlias}</b>
      </header>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="agentId"
        rowSelection={{ type: 'radio', ...rowSelection }}
        // onRow={(record) => ({onClick: () => handleSelect(record)})}
        pagination={{
          current: pagination.pageNum,
          onChange: (page, pageSize) => {
            dispatch({ pageNum: page, pageSize });
          },
          pageSize: pagination.pageSize,
          total: pagination.total
        }}
      />

      {viewRowAgentId ? (
        <AgentInfoModal
          id={viewRowAgentId}
          onClose={() => setViewRowAgentId(undefined)}
        />
      ) : null}
    </div>
  );
});

export default AgentList;
