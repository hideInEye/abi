import React, { useEffect, useState } from "react";

import {
  fetchOperateNew,
  fetchOperateNewList,
} from "@/service/api/operateRecord";
import { message } from "antd";

interface OperateRecord {
  readonly id: string;
  readonly chatId: string;
  spaceId: number
}

interface Response {
  rows: any[];
  total: number;
}

export const Component: React.FC & { loader?: () => Promise<any> } = () => {
  const [dataSource, setDataSource] = useState<Response>({
    rows: [],
    total: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const { switchToSpace } = useSpaceSwitch();


  async function getRecordList() {
    const data: any = await fetchOperateNewList();

    setDataSource({
      total: data.response.data.total,
      rows: data.response.data.rows,
    });
  }
  const handleSearch = () => {
    const keyword = searchValue.trim();
    getRecordList();
  };

  function onSearchChange(e: any) {
    const key = e.target.value;
    if (key) {
      setCurrentPage(1);
      setDataSource({
        rows: [],
        total: 0,
      });
      getRecordList();
    }
  }

  useEffect(() => {
    getRecordList();
  }, []);

  function paginationChange(page: number) {
    setCurrentPage(page);
    getRecordList();
  }

  const handleNavigate = (r:OperateRecord) => {
    const { spaceId, chatId } = r
    switchToSpace(spaceId, undefined, { chatId })
  };

  const handleCollect = async (id: string) => {
    const res: any = await fetchOperateNew({
      chatId: id,
      type: 2,
    });
    if(res.response.data.code !== 200){
      message.error(res.response.data.msg);
    }else {
      message.success(res.response.data.msg);
      getRecordList();
    }
  };

  const columns = [
    {
      align: "center",
      dataIndex: "chatName",
      key: "chatName",
      minWidth: 140,
      title: "对话名称",
    },
    {
      align: "center",
      dataIndex: "spaceName",
      key: "spaceName",
      minWidth: 120,
      title: "所属空间",
    },
    {
      align: "center",
      dataIndex: "recentlyUseTime",
      key: "recentlyUseTime",
      minWidth: 140,
      title: "收藏时间",
    },
    {
      align: "center",
      dataIndex: "action",
      key: "action",
      width: 150,
      fixed: "right",
      title: "操作",
      render: (_: any, record: OperateRecord) => (
        <div className="flex items-center justify-center gap-12px">
          <AButton color="primary" size="small" variant="link" onClick={() => handleNavigate(record)}>进入对话</AButton>
          <AButton color="primary" size="small" variant="link" onClick={() => handleCollect(record.chatId)}>取消收藏</AButton>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <h1 className="text-base font-medium">我的收藏</h1>
      <div className="flex items-center gap-4">
        <AInput
          placeholder="请输入对话名称"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: '12.5rem' }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            border: '0.0625rem solid #d9d9d9',
            borderRadius: '0.5rem',
            overflow: 'hidden',
          }}
        >
          <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
            <ATable
              columns={columns}
              dataSource={dataSource.rows}
              loading={false}
              pagination={false}
              rowKey="id"
              scroll={dataSource.rows?.length > 0 ? { x: 'max-content' } : undefined}
              size="middle"
              className="my-collect-table abi-std-table"
            />
          </div>
        </div>
        <div
          style={{
            padding: '0.75rem 0',
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 'auto'
          }}
        >
          <APagination
            current={currentPage}
            total={dataSource.total}
            onChange={paginationChange}
            showSizeChanger
            style={{ padding: '0'}}
          />
        </div>
      </div>
    </div>
  );
};
