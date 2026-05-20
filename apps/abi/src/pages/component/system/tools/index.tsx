import { Button, Input, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useState } from 'react';

import PageTitle from '@/components/stateless/common/PageTitle';
import type { ToolItem } from '@/service/api/tool';
import { queryToolListApi } from '@/service/api/tool';

export function Component() {
  const [searchValue, setSearchValue] = useState('');
  const [list, setList] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchList(params: { toolName?: string } = {}) {
    setLoading(true);
    try {
      const res: any = await queryToolListApi(params);
      const rows =
        res?.response?.data?.data ||
        res?.data?.data ||
        res?.data ||
        [];
      setList(Array.isArray(rows) ? rows : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  function handleSearch() {
    const keyword = searchValue.trim();
    fetchList({ toolName: keyword || undefined });
  }

  function handleAdd() {
    // TODO: 新增内置工具
  }

  function handleEdit(_record: ToolItem) {
    // TODO: 编辑内置工具
  }

  function handleDelete(_record: ToolItem) {
    // TODO: 删除内置工具
  }

  const columns: ColumnsType<ToolItem> = [
    {
      title: '工具名称（英文标识）',
      dataIndex: 'toolName',
      key: 'toolName',
      width: 220
    },
    {
      title: '功能描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) =>
        String(status) === '0' ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="default">禁用</Tag>
        )
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 200,
      render: (t: string) => (t ? t.replace('T', ' ') : '-')
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button
            type="default"
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            danger
            type="primary"
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div
      className="flex flex-col gap-2 p-6"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <PageTitle />
      <div className="flex items-center gap-4">
        <Input
          allowClear
          placeholder="请输入工具名称搜索"
          value={searchValue}
          onChange={e => setSearchValue(e.target.value)}
          onPressEnter={handleSearch}
          style={{ width: '12.5rem', marginTop: '6px' }}
        />
        <Button
          className="ml-auto"
          type="primary"
          onClick={handleAdd}
        >
          新增
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            border: '0.0625rem solid #d9d9d9',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            width: '100%',
            maxHeight: '100%'
          }}
        >
          <div style={{ overflow: 'auto', maxHeight: '100%' }}>
            <Table<ToolItem>
              rowKey="toolId"
              columns={columns}
              dataSource={list}
              loading={loading}
              pagination={false}
              size="small"
              scroll={list.length > 0 ? { x: 'max-content' } : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Component;
