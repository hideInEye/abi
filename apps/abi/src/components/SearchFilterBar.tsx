import { DownOutlined, FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import styles from './SearchFilterBar.module.css';

/** 搜索输入框停止输入后自动发起查询的防抖时长（毫秒） */
const SEARCH_DEBOUNCE_MS = 1000;

interface SearchFilterBarProps {
  /** 高级筛选面板中的筛选项（一行两个），无筛选项时不渲染高级筛选按钮 */
  readonly filters?: React.ReactNode;
  /** 查询回调（点击面板查询按钮 / 输入框回车） */
  readonly onQuery: () => void;
  /** 重置回调（点击面板重置按钮） */
  readonly onReset?: () => void;
  /** 搜索输入变化回调 */
  readonly onSearchChange?: (value: string) => void;
  readonly searchPlaceholder?: string;
  /** 自定义搜索输入框（如 Form.Item 包裹）；传入时忽略 searchValue/onSearchChange */
  readonly searchSlot?: React.ReactNode;
  readonly searchValue?: string;
}

/** 高级筛选面板中的单个筛选项容器（label + 控件），一行两个 */
export const SearchFilterField: React.FC<{ readonly children: React.ReactNode; readonly label: string }> = ({ children, label }) => (
  <label className={styles.filterField}>
    <span>{label}</span>
    {children}
  </label>
);

/** 供面板内 Select / DatePicker 使用，保证下拉挂载在 Popover 内部避免点击时面板关闭 */
export const getFilterPopupContainer = (trigger: HTMLElement): HTMLElement =>
  (trigger.closest('.ant-popover-inner') as HTMLElement) || (trigger.parentElement as HTMLElement);

/**
 * 统一搜索栏 — v5 风格
 * 搜索输入框占满一行自适应 + 「高级筛选」按钮（参考图谱探索工具栏按钮风格）
 * 高级筛选面板：筛选项一行两个 + 底部重置/查询（参考图谱探索高级搜索面板）
 */
export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  filters,
  onQuery,
  onReset,
  onSearchChange,
  searchPlaceholder = '请输入关键字',
  searchSlot,
  searchValue,
}) => {
  const [open, setOpen] = useState(false);

  // 始终指向最新的 onQuery，避免防抖定时器触发时使用过期闭包
  const onQueryRef = useRef(onQuery);
  useEffect(() => {
    onQueryRef.current = onQuery;
  }, [onQuery]);

  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const clearTimer = useCallback((): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);
  useEffect(() => clearTimer, [clearTimer]);

  const handleQuery = useCallback((): void => {
    clearTimer();
    setOpen(false);
    onQuery();
  }, [onQuery, clearTimer]);

  const handleReset = useCallback((): void => {
    clearTimer();
    setOpen(false);
    onReset?.();
  }, [onReset, clearTimer]);

  // 输入框内容变化：停止输入 2s 后自动查询；清空时立即查询
  const handleSearchChange = useCallback(
    (value: string): void => {
      onSearchChange?.(value);
      clearTimer();
      timerRef.current = setTimeout(() => onQueryRef.current(), value === '' ? 0 : SEARCH_DEBOUNCE_MS);
    },
    [onSearchChange, clearTimer],
  );

  const panelContent = (
    <div className={styles.filterPanel}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {filters}
        <div className="col-span-2 flex items-end justify-end gap-3">
          <AButton className={styles.resetBtn} icon={<ReloadOutlined />} onClick={handleReset}>
            重置
          </AButton>
          <AButton className={styles.queryBtn} type="primary" onClick={handleQuery}>
            <SearchOutlined /> 查询
          </AButton>
        </div>
      </div>
    </div>
  );

  return (
    <div className="abi-search-row w-full">
      {searchSlot ?? (
        <AInput
          allowClear
          className="abi-field-input flex-1 min-w-0"
          placeholder={searchPlaceholder}
          prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
          value={searchValue}
          onChange={(event) => handleSearchChange(event.target.value)}
          onPressEnter={handleQuery}
        />
      )}
      {filters ? (
        <Popover content={panelContent} open={open} placement="bottomRight" trigger="click" onOpenChange={setOpen}>
          <AButton className={styles.filterBtn} icon={<FilterOutlined />}>
            高级筛选
            <DownOutlined className={`${styles.filterArrow} ${open ? styles.filterArrowOpen : ''}`} />
          </AButton>
        </Popover>
      ) : null}
    </div>
  );
};
