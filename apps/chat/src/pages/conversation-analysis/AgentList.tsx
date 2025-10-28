import { FileTextOutlined } from "@ant-design/icons";
import { Table, TableProps } from "antd";
import React, { useEffect, useReducer, useState, forwardRef, useImperativeHandle } from "react"
import { fetchAgentList } from "../../service/api/app";
import AgentInfoModal from "./AgentInfoModal";
import { getSpaceId } from "../../utils";

interface PropsType {
  setAgentId: (id: number) => void
  agentId?: number
}

export type AgentListHandle = {
  resetState: () => void;
};

const initVal = {
  pageNum: 1,
  pageSize: 20,
  total: 0
};

const reducer = (state: any, field: any) => {
  return {
    ...state,
    ...field
  }
}

const AgentList = forwardRef<AgentListHandle, PropsType>(({ setAgentId, agentId }, ref) => {
  const [pagination, dispatch] = useReducer(reducer, initVal);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [selectedRow, setSelectedRow] = useState<any>({});
  const [viewRowAgentId, setViewRowAgentId] = useState<number>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  useEffect(() => {
    if (agentId && dataSource?.length > 0) {
      const target = dataSource.find(item => item.agentId === agentId);
      if (target) {
        setSelectedRow(target);
        setSelectedRowKeys([agentId]);
      }
    }
  }, [agentId, dataSource]);
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
    // {
    //   key: 'act',
    //   render: (_: unknown, record: any) => {
    //     return <FileTextOutlined onClick={() => setViewRowAgentId(record.agentId)} />;
    //   },
    //   title: '操作'
    // }
  ];

  const getAgentList = async () => {
    const res: any = await fetchAgentList({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      spaceId: getSpaceId()
    });
    setDataSource(res.rows);
    dispatch(res.total);
  };

  useEffect(() => {
    getAgentList();
  }, [pagination.pageNum, pagination.pageSize]);

  const rowSelection: TableProps<any>['rowSelection'] = {
    type: 'radio',
    selectedRowKeys,
    onChange: (keys: React.Key[], selectedRows: any[]) => {
      setSelectedRowKeys(keys);
      setAgentId(keys[0] as number);
      setSelectedRow(selectedRows[0] || {});
    }
  };

  useImperativeHandle(ref, () => ({
    resetState: () => {
      setSelectedRowKeys([]);
      setSelectedRow({});
      setAgentId(0);
    }
  }));

  return (
    <div>
      <header className="pb-2 pt-4">
        <b>已选择：{selectedRow.agentAlias}</b>
      </header>
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="agentId"
        rowSelection={rowSelection}
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
})

AgentList.displayName = 'AgentList';

export default AgentList
