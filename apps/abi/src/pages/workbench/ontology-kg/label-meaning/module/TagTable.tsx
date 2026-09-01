import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Popconfirm, Table } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { OntologyCardList } from '@/pages/workbench/ontology-kg/components/OntologyCardList';
import { OntologyTablePagination } from '@/pages/workbench/ontology-kg/components/OntologyTablePagination';
import type { OntologyViewMode } from '@/pages/workbench/ontology-kg/hooks/useOntologyViewControls';
import { formatDateTime, formatDisplayValue } from '@/pages/workbench/ontology-kg/utils/table-display';
import { shouldDisplayColumn } from '@/pages/workbench/ontology-kg/utils/view-controls';

import { tabTypeOptions } from '../constants';
import type { TagGroup } from '../types';

interface TagTableProps {
  readonly dataSource: TagGroup[];
  readonly onDelete: (tagId: number) => Promise<void>;
  readonly onEdit: (group: TagGroup) => void;
  readonly viewMode: OntologyViewMode;
  readonly visibleColumnKeys: ReadonlySet<string>;
}

export const TagTable: React.FC<TagTableProps> = ({ dataSource, onDelete, onEdit, viewMode, visibleColumnKeys }) => {
  const renderTagType = useCallback((tagType: string) => formatDisplayValue(tabTypeOptions.find(item => item.value === tagType)?.label), []);
  const renderTableActions = useCallback(
    (record: TagGroup) => (
      <div className="ds-action-group">
        <AButton className="abi-action-link" icon={<EditOutlined />} size="small" variant="link" onClick={() => onEdit(record)}>
          编辑
        </AButton>
        <Popconfirm cancelText="取消" description="确定要删除吗？" okText="确定" title="提示" onConfirm={() => onDelete(record.tagId)}>
          <AButton className="abi-action-link-danger" icon={<DeleteOutlined />} size="small" variant="link">
            删除
          </AButton>
        </Popconfirm>
      </div>
    ),
    [onDelete, onEdit],
  );
  const renderCardActions = useCallback(
    (record: TagGroup) => (
      <div className="flex items-center gap-1">
        <AButton className="abi-action-link" icon={<EditOutlined />} size="small" variant="link" onClick={() => onEdit(record)}>
          编辑
        </AButton>
        <Popconfirm cancelText="取消" description="确定要删除吗？" okText="确定" title="提示" onConfirm={() => onDelete(record.tagId)}>
          <AButton className="abi-action-link-danger" icon={<DeleteOutlined />} size="small" variant="link">
            删除
          </AButton>
        </Popconfirm>
      </div>
    ),
    [onDelete, onEdit],
  );
  const columns: any[] = useMemo(
    () => [
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
        render: renderTagType,
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
        width: 168,
        render: (_: any, record: TagGroup) => renderTableActions(record),
      }
    ],
    [renderTableActions, renderTagType],
  );

  const visibleColumns = useMemo(() => columns.filter((column: any) => shouldDisplayColumn(column.key, visibleColumnKeys)), [columns, visibleColumnKeys]);
  const columnWidth = useMemo(() => {
    return visibleColumns.reduce((total: number, column: any) => total + (column.minWidth || column.width || 100), 0);
  }, [visibleColumns]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pagedDataSource = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return dataSource.slice(startIndex, startIndex + pageSize);
  }, [currentPage, dataSource, pageSize]);

  const totalCount = dataSource.length;

  useEffect(() => {
    setCurrentPage(1);
  }, [dataSource, pageSize]);

  const handlePaginationChange = useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);
  const cardFields = useMemo(
    () =>
      [
        { key: 'createBy', label: '创建人', render: (record: TagGroup) => formatDisplayValue(record.createBy) },
        { key: 'createTime', label: '创建时间', render: (record: TagGroup) => formatDateTime(record.createTime) },
        { key: 'updateTime', label: '操作时间', render: (record: TagGroup) => formatDateTime(record.updateTime) },
      ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {viewMode === 'card' ? (
        <OntologyCardList
          actions={renderCardActions}
          dataSource={pagedDataSource}
          emptyText="暂无标签语义"
          fields={cardFields}
          rowKey={record => record.id || record.tagId}
          title={record => formatDisplayValue(record.tagName)}
          titleExtra={record => renderTagType(record.tagType)}
        />
      ) : (
        <div
          style={{
            border: '1px solid rgba(130,140,200,0.18)',
            borderRadius: '12px',
            overflow: 'hidden',
            flex: 1,
            minHeight: 0,
            width: '100%',
          }}
        >
          <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
            <Table
              columns={visibleColumns}
              dataSource={pagedDataSource}
              rowKey="id"
              scroll={pagedDataSource?.length > 0 ? { x: columnWidth } : undefined}
              size="middle"
              className="tag-table abi-std-table"
              locale={{ emptyText: <TableEmpty description="暂无标签语义" /> }}
              pagination={false}
            />
          </div>
        </div>
      )}
      <OntologyTablePagination pageNum={currentPage} pageSize={pageSize} total={totalCount} onChange={handlePaginationChange} />
    </div>
  );
};
