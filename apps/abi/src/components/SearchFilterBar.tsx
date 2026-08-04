import { DownOutlined, FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Popover } from 'antd';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import styles from './SearchFilterBar.module.css';

/** 搜索输入框停止输入后自动发起查询的防抖时长（毫秒） */
const SEARCH_DEBOUNCE_MS = 1000;

/** 搜索栏对外广播的「查询/重置」信号：nonce 变化即触发一次对应动作 */
interface SearchFilterSignals {
  /** 每次点击「查询」自增，用于提交延迟生效的筛选控件（如时间范围） */
  readonly queryNonce: number;
  /** 每次点击「重置」自增，用于清空延迟生效的筛选控件 */
  readonly resetNonce: number;
}

const SearchFilterContext = createContext<SearchFilterSignals>({ queryNonce: 0, resetNonce: 0 });

/**
 * 延迟生效的时间范围选择器：内部维护草稿值，选择时不会立即触发外部 onChange，
 * 只有当用户点击「查询」按钮时才把草稿提交给外部（applied）值；点击「重置」时清空草稿。
 * 用法与 ADatePicker.RangePicker 一致：value 传入已生效值，onChange 为已生效值的 setter。
 * 必须渲染在 <SearchFilterBar> 的 filters 面板内才能接收查询/重置信号。
 */
export const DeferredRangePicker: React.FC<{ readonly value?: any; readonly onChange?: (value: any) => void; readonly [key: string]: any }> = ({
  value,
  onChange,
  ...rest
}) => {
  const { queryNonce, resetNonce } = useContext(SearchFilterContext);
  const [pending, setPending] = useState<any>(value ?? null);

  // 外部已生效值变化时（提交或重置后）同步回草稿，保证再次打开面板显示的是已生效值
  useEffect(() => {
    setPending(value ?? null);
  }, [value]);

  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 点击「查询」时才把草稿提交为已生效值（跳过挂载时的首次触发）
  const queryMounted = useRef(false);
  useEffect(() => {
    if (!queryMounted.current) {
      queryMounted.current = true;
      return;
    }
    onChangeRef.current?.(pendingRef.current);
  }, [queryNonce]);

  // 点击「重置」时清空草稿（跳过挂载时的首次触发）
  const resetMounted = useRef(false);
  useEffect(() => {
    if (!resetMounted.current) {
      resetMounted.current = true;
      return;
    }
    setPending(null);
  }, [resetNonce]);

  return <ADatePicker.RangePicker {...rest} value={pending} onChange={(dates: any) => setPending(dates)} />;
};

/**
 * 延迟生效的下拉选择器：内部维护草稿值，选择时不会立即触发外部 onChange，
 * 只有当用户点击「查询」按钮时才把草稿提交给外部（applied）值；点击「重置」时清空草稿。
 * 用法与 ASelect 一致：value 传入已生效值，onChange 为已生效值的 setter。
 * 必须渲染在 <SearchFilterBar> 的 filters 面板内才能接收查询/重置信号。
 */
export const DeferredSelect: React.FC<{ readonly value?: any; readonly onChange?: (value: any) => void; readonly [key: string]: any }> = ({
  value,
  onChange,
  ...rest
}) => {
  const { queryNonce, resetNonce } = useContext(SearchFilterContext);
  const [pending, setPending] = useState<any>(value ?? undefined);

  // 外部已生效值变化时（提交或重置后）同步回草稿，保证再次打开面板显示的是已生效值
  useEffect(() => {
    setPending(value ?? undefined);
  }, [value]);

  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // 点击「查询」时才把草稿提交为已生效值（跳过挂载时的首次触发）
  const queryMounted = useRef(false);
  useEffect(() => {
    if (!queryMounted.current) {
      queryMounted.current = true;
      return;
    }
    onChangeRef.current?.(pendingRef.current);
  }, [queryNonce]);

  // 点击「重置」时清空草稿（跳过挂载时的首次触发）
  const resetMounted = useRef(false);
  useEffect(() => {
    if (!resetMounted.current) {
      resetMounted.current = true;
      return;
    }
    setPending(undefined);
  }, [resetNonce]);

  return <ASelect {...rest} value={pending} onChange={(val: any) => setPending(val)} />;
};

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
  // 「查询/重置」信号，供面板内的 DeferredRangePicker 延迟提交/清空草稿
  const [queryNonce, setQueryNonce] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);
  const signals = useMemo<SearchFilterSignals>(() => ({ queryNonce, resetNonce }), [queryNonce, resetNonce]);

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
    setQueryNonce((n) => n + 1);
    onQuery();
  }, [onQuery, clearTimer]);

  const handleReset = useCallback((): void => {
    clearTimer();
    setOpen(false);
    setResetNonce((n) => n + 1);
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
    <SearchFilterContext.Provider value={signals}>
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
    </SearchFilterContext.Provider>
  );
};
