import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Pagination, Popconfirm, Space, Table, Tooltip } from 'antd';
import React from 'react';

import { tabTypeOptions } from '../constants';
import type { TagGroup } from '../types';

interface TagTableProps {
  readonly dataSource: TagGroup[];
  readonly onDelete: (tagId: number) => void;
  readonly onEdit: (group: TagGroup) => void;
}

export const TagTable: React.FC<TagTableProps> = ({ dataSource, onDelete, onEdit }) => {
  const columns: any[] = [
    {
      align: 'center',
      dataIndex: 'tagName',
      key: 'tagName',
      title: '中文名',
      minWidth: 100,
      ellipsis: true
    },
    {
      align: 'center',
      dataIndex: 'engName',
      key: 'engName',
      title: '英文名',
      minWidth: 100,
      ellipsis: true
    },
    {
      align: 'center',
      dataIndex: 'tagType',
      key: 'tagType',
      render: (tagType: string) => {
        return tabTypeOptions.find(item => item.value === tagType)?.label;
      },
      title: '标准类型',
      minWidth: 100,
      ellipsis: true
    },
    {
      align: 'center',
      dataIndex: 'alias',
      key: 'alias',
      title: '别名',
      minWidth: 100,
      ellipsis: true
    },
    {
      align: 'center',
      dataIndex: 'remark',
      key: 'remark',
      title: '文本定义',
      minWidth: 160,
      ellipsis: true
    },
    {
      align: 'center',
      fixed: 'right',
      key: 'action',
      title: '操作',
      width: 120,
      render: (_: any, record: TagGroup) => (
        <div className="flex items-center justify-center gap-12px">
          <Button color="primary" size="small" variant="link" onClick={() => onEdit(record)}>编辑</Button>
          <Popconfirm cancelText="取消" description="确定要删除吗？" okText="确定" title="提示" onConfirm={() => onDelete(record.tagId)}>
            <Button color="danger" size="small" variant="link">删除</Button>
          </Popconfirm>
        </div>
      ),
    }
  ];

  const columnWidth = useMemo(() => {
    return columns.reduce((total, column: any) => total + (column.minWidth || column.width || 100), 0);
  }, [columns]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pagedDataSource = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return dataSource.slice(startIndex, startIndex + pageSize);
  }, [currentPage, dataSource, pageSize]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dataSource, pageSize]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="assistant-table-scroll" style={{ border: '1px solid #d9d9d9', borderRadius: '8px', overflow: 'hidden' }}>
        <Table
          columns={columns}
          dataSource={pagedDataSource}
          rowKey="id"
          scroll={pagedDataSource?.length > 0 ? {x: columnWidth} : undefined}
          size="middle"
          className="tag-table assistant-table-scroll abi-std-table"
          pagination={false}
          style={{ fontFamily: 'PingFangSC, PingFang SC', fontWeight: 400, fontSize: '0.875rem', color: '#333333' }}
        />
      </div>
      <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={dataSource.length}
          showSizeChanger
          onChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
        />
      </div>
    </div>
  );
};
