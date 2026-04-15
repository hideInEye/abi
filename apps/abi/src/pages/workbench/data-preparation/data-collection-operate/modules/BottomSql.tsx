import {
  CheckCircleFilled,
  DownOutlined,
  LeftOutlined,
  ReloadOutlined,
  RightOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, InputNumber, Select, Spin, Tabs, message } from 'antd';
import type { Dispatch } from 'react';
import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';

import { getPreviewSql } from '@/service/api';

import styles from '../index.module.css';
import DataPreview from './DataPreview';

interface PropsType {
  setPreviewData: Dispatch<any>;
  sourceId?: string;
  sql: string;
  onLoadingChange?: (loading: boolean) => void;
}

export interface BottomSqlHandle {
  run: () => void;
}

interface ResultTab {
  key: string;
  label: string;
  rawData: any;
  total: number;
}

const PAGE_SIZE_OPTIONS = [
  { label: 50, value: 50 },
  { label: 100, value: 100 },
  { label: 200, value: 200 },
  { label: 500, value: 500 },
];

const BottomSql = forwardRef<BottomSqlHandle, PropsType>(
  ({ setPreviewData, sourceId, sql, onLoadingChange }, ref) => {
    const [loading, setLoading] = useState(false);
    const [tabs, setTabs] = useState<ResultTab[]>([]);
    const [activeKey, setActiveKey] = useState('');
    const [pagination, setPagination] = useState({ pageNo: 1, pageSize: 200, total: 0 });
    const [pageInputVal, setPageInputVal] = useState(1);

    const handlePreview = async () => {
      if (!sql) { message.error('请输入sql语句'); return; }
      if (!sourceId) { message.error('请选择数据源'); return; }
      try {
        setLoading(true);
        onLoadingChange?.(true);
        const res = await getPreviewSql({ sourceId, sql });
        if (res.data) {
          setPreviewData(res.data);
          const total = res.data?.data?.data?.length || 0;
          const tabKey = `result_${Date.now()}`;
          setTabs((prev) => [...prev, { key: tabKey, label: `结果 ${prev.length + 1}`, rawData: res.data, total }]);
          setActiveKey(tabKey);
          setPagination({ pageNo: 1, pageSize: 200, total });
          setPageInputVal(1);
        }
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    useImperativeHandle(ref, () => ({ run: handlePreview }));

    const activeTab = tabs.find((t) => t.key === activeKey);
    const totalPages = Math.ceil((activeTab?.total || 0) / pagination.pageSize) || 1;
    const isFirst = pagination.pageNo <= 1;
    const isLast = pagination.pageNo >= totalPages;

    const pagedPreviewData = useMemo(() => {
      if (!activeTab?.rawData) return {};
      const allRows = activeTab.rawData?.data?.data || [];
      const start = (pagination.pageNo - 1) * pagination.pageSize;
      return {
        ...activeTab.rawData,
        data: { ...activeTab.rawData.data, data: allRows.slice(start, start + pagination.pageSize) },
      };
    }, [activeTab, pagination]);

    const goPage = (p: number) => {
      const page = Math.max(1, Math.min(p, totalPages));
      setPagination((prev) => ({ ...prev, pageNo: page }));
      setPageInputVal(page);
    };

    const exportCSV = (all = false) => {
      if (!activeTab?.rawData) return;
      const fields: any[] = activeTab.rawData?.data?.fields || [];
      const allRows: any[] = activeTab.rawData?.data?.data || [];
      const start = (pagination.pageNo - 1) * pagination.pageSize;
      const rows = all ? allRows : allRows.slice(start, start + pagination.pageSize);
      const csv = [
        fields.map((f) => f.tfieldShowName).join(','),
        ...rows.map((row) => fields.map((f) => `"${row[f.tfieldName || f.tfieldShowName] ?? ''}"`).join(',')),
      ].join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
      a.download = `result_${Date.now()}.csv`;
      a.click();
    };

    const removeTab = (key: string) => {
      const newTabs = tabs.filter((t) => t.key !== key);
      setTabs(newTabs);
      if (activeKey === key) setActiveKey(newTabs.at(-1)?.key || '');
    };

    const iconCls = (disabled: boolean) =>
          disabled ? `${styles['page-icon']} ${styles['page-icon-disabled']}` : styles['page-icon'];

    /** 分页导航 */
    const renderPagination = () => (
      <div className={styles['bottom-sql-toolbar-group']}>
        <VerticalRightOutlined className={iconCls(isFirst)} onClick={() => !isFirst && goPage(1)} />
        <LeftOutlined className={iconCls(isFirst)} onClick={() => !isFirst && goPage(pagination.pageNo - 1)} />
        <InputNumber
          className={styles['page-input']}
          controls={false}
          min={1}
          size="small"
          style={{ width: 32 }}
          value={pageInputVal}
          onChange={(v) => setPageInputVal(v ?? 1)}
          onBlur={() => goPage(pageInputVal)}
          onPressEnter={() => goPage(pageInputVal)}
        />
        <RightOutlined className={iconCls(isLast)} onClick={() => !isLast && goPage(pagination.pageNo + 1)} />
        <VerticalLeftOutlined className={iconCls(isLast)} onClick={() => !isLast && goPage(totalPages)} />
        <Select
          popupMatchSelectWidth={false}
          size="small"
          value={pagination.pageSize}
          options={PAGE_SIZE_OPTIONS}
          onChange={handlePageSizeChange}
        />
        <Button type="link" size="small" style={{ color: '#3467FF' }}>总数：{activeTab?.total}</Button>
      </div>
    );
    
    /** 导出菜单 */
    const exportMenuItems = [
      { key: 'cur', label: '导出当前页 CSV', onClick: () => exportCSV(false) },
      { key: 'all', label: '导出全部 CSV', onClick: () => exportCSV(true) },
    ];

    const handlePageSizeChange = (v: number) => {
      setPagination({ pageNo: 1, pageSize: v, total: pagination.total });
      setPageInputVal(1);
    };

    return (
      <div className={styles['bottom-sql']}>
        {tabs.length > 0 && (
          <Tabs
            hideAdd
            size="small"
            type="editable-card"
            activeKey={activeKey}
            items={tabs.map((t) => ({ key: t.key, label: <span><CheckCircleFilled style={{ color: '#3467FF', marginRight: 4 }} /><span style={{ color: '#333' }}>{t.label}</span></span>, closable: true }))}
            className="flex-shrink-0 mb-0"
            tabBarStyle={{ marginBottom: 0 }}
            onChange={setActiveKey}
            onEdit={(k, action) => action === 'remove' && removeTab(k as string)}
          />
        )}

        {activeTab && (
          <div className={styles['bottom-sql-toolbar']}>
            {renderPagination()}
            <div className={styles['bottom-sql-toolbar-group']}>
              <ReloadOutlined className={styles['toolbar-icon-btn']} title="刷新" onClick={handlePreview} />
            </div>
            <div className={styles['bottom-sql-toolbar-right']}>
              <Dropdown menu={{ items: exportMenuItems }} trigger={['click']}>
                <span style={{ cursor: 'pointer', fontSize: 13 }}>导出 <DownOutlined style={{ fontSize: 10 }} /></span>
              </Dropdown>
            </div>
          </div>
        )}

        <div className={styles['bottom-sql-content']}>
          {loading ? (
            <div className={styles['bottom-sql-loading']}><Spin /></div>
          ) : activeTab ? (
            <DataPreview isSql previewData={pagedPreviewData} />
          ) : (
            <div className={styles['bottom-sql-empty']}>暂无数据，请先执行 SQL</div>
          )}
        </div>
      </div>
    );
  },
);

export default BottomSql;
