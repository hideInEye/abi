import React, { useEffect, useState } from "react";

import {
  fetchOperateNew,
  fetchOperateNewList,
} from "@/service/api/operateRecord";
import { message } from "antd";
import { localStg } from "@/utils/storage";

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
  const { switchToSpace } = useSpaceSwitch();


  async function getRecordList() {
    const data: any = await fetchOperateNewList();

    setDataSource({
      total: data.response.data.total,
      rows: data.response.data.rows,
    });
  }

  function onSearchChange(e: any) {
    const key = e.target.value;
    if (key) {
      setCurrentPage(1);
      setDataSource({
        rows: [],
        total: 0,
      });
      getRecordList(key);
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
    switchToSpace(spaceId)
    localStorage.setItem('chatId',chatId)
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
      dataIndex: "chatName",
      key: "chatName",
      title: "对话名称",
    },
    {
      dataIndex: "spaceName",
      key: "spaceName",
      title: "所属空间",
    },
    {
      dataIndex: "recentlyUseTime",
      key: "recentlyUseTime",
      title: "收藏时间",
    },
    {
      dataIndex: "action",
      key: "action",
      render: (_: any, record: OperateRecord) => (
        <div className="text-[#1890ff]">
          <span
            className="cursor-pointer"
            onClick={() => {
              handleNavigate(record);
            }}
          >
            进入对话
          </span>
          <span
            className="ml-4 cursor-pointer"
            onClick={() => {
              handleCollect(record.chatId);
            }}
          >
            取消收藏
          </span>
        </div>
      ),
      title: "操作",
    },
  ];

  return (
    <ACard>
      <ASpace className="flex justify-between">
        <h1 className="mb-4 text-base font-medium">最近收藏</h1>
        {/* <AInput
          className="flex-1"
          placeholder="搜索"
          onChange={onSearchChange}
        /> */}
      </ASpace>

      <ATable
        columns={columns}
        dataSource={dataSource.rows}
        pagination={{
          current: currentPage,
          onChange: paginationChange,
          total: dataSource.total,
        }}
      />
    </ACard>
  );
};
