import React, { useEffect, useState } from "react";

import { getOperateRecordList } from "@/service/api/operateRecord";
import { useSpaceSwitch } from '@/hooks/business/useSpaceSwitch';
import { localStg } from "@/utils/storage";

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

  async function getRecordList(key?: string) {
    const data: any = await getOperateRecordList("1");

    setDataSource({
      total: data.response.data.total,
      rows: data.response.data.rows,
    });
  }

  function onSearchChange(e: any) {
    const key = e.target.value;
    setCurrentPage(1);
    setDataSource({
      rows: [],
      total: 0,
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

  const handleNavigate = (r:any) => {
    const { spaceId, chatId} = r
    switchToSpace(spaceId)
    localStorage.setItem('chatId',chatId)
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
      title: "最近使用时间",
    },
    {
      dataIndex: "opreation",
      key: "opreation",
      title: "操作",
      render: (_,r) => (
        <span
          className="cursor-pointer text-[#1890ff]"
          onClick={()=>{handleNavigate(r)}}
        >
          进入对话
        </span>
      ),
    },
  ];

  return (
    <ACard>
      <ASpace className="flex justify-between">
        <h1 className="mb-4 text-base font-medium">最近使用</h1>
        {/* <AInput
          className="flex-1"
          placeholder="搜索"
          onChange={onSearchChange}
        /> */}
      </ASpace>

      <ATable
        columns={columns}
        dataSource={dataSource.rows}
        pagination={false}
      />
    </ACard>
  );
};
