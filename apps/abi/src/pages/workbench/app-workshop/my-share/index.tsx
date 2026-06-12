import { DeleteOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";

import {
  deleteOperateRecord,
  getOperateRecordList,
} from "@/service/api/operateRecord";
import { message } from "antd";

interface OperateRecord {
  readonly id: string;
  readonly chatId: string;
  spaceId: number;
}

export const Component: React.FC & { loader?: () => Promise<any> } = () => {
  const [dataSource, setDataSource] = useState<any>({
    rows: [],
    total: 0,
  });
  const { switchToSpace } = useSpaceSwitch();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchValue, setSearchValue] = useState("");
  const pageSize = 10;

  async function getRecordList(key?: string) {
    const data = await getOperateRecordList('3',{
      // key: searchValue,
      pageNumber: currentPage,
      pageSize,
      // spaceId: localStorage.getItem('spaceId'),
    });
    setDataSource(data.response.data);
  }
  const handleSearch = () => {
    const keyword = searchValue.trim();
    getRecordList(keyword || undefined);
  };

  function onSearchChange(e: any) {
    const key = e.target.value;
    if (key) {
      setSearchValue(key);
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

  function deleteOperateRecordItem(ids: string) {
    deleteOperateRecord(ids).then((res) => {
      if (res.response.data.code > 200) {
        message.error(res.response.data.msg);
      } else {
        message.success(res.response.data.msg);
        getRecordList();
      }
    });
  }

  const handleNavigate = (r: OperateRecord) => {
    const { spaceId, chatId } = r;
    switchToSpace(spaceId, undefined, { chatId });
  };

  const ActionButtons: React.FC<{ readonly record: OperateRecord }> = ({
    record,
  }) => (
    <div className="flex items-center gap-12px">
      <AButton color="primary" size="small" variant="link" onClick={() => handleNavigate(record)}>进入对话</AButton>
      <APopconfirm cancelText="取消" description="确定要删除吗？" okText="确认" title="删除" onConfirm={() => deleteOperateRecordItem(record.id)}>
        <AButton color="danger" size="small" variant="link">删除</AButton>
      </APopconfirm>
    </div>
  );

  const columns: any[] = [
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
      dataIndex: "type",
      key: "type",
      minWidth: 100,
      title: "分享类型",
      render: () => "快照",
    },
    {
      align: "center",
      dataIndex: "sharedTime",
      key: "sharedTime",
      minWidth: 140,
      title: "分享时间",
    },
    {
      align: "center",
      dataIndex: "action",
      key: "action",
      width: 150,
      fixed: "right",
      render: (_: any, record: OperateRecord) => (
        <ActionButtons record={record} />
      ),
      title: "操作",
    },
  ];

  return (
    <div className="flex flex-col gap-4 p-6"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <h1 className="text-base font-medium">我的分享列表</h1>
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
              className="my-share-table abi-std-table"
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
            pageSize={pageSize}
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
