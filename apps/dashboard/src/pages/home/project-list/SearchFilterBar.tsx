import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Popover } from 'antd';
import { DownOutlined, FilterOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import './SearchFilterBar.less';

/** 搜索输入框停止输入后自动发起查询的防抖时长（毫秒） */
const SEARCH_DEBOUNCE_MS = 1000;

interface SearchFilterBarProps {
    /** 高级筛选面板中的筛选项（一行两个），无筛选项时不渲染高级筛选按钮 */
    filters?: React.ReactNode;
    /** 查询回调（点击面板查询按钮 / 输入框回车） */
    onQuery: () => void;
    /** 重置回调（点击面板重置按钮） */
    onReset?: () => void;
    /** 搜索输入变化回调 */
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    searchValue?: string;
}

/** 高级筛选面板中的单个筛选项容器（label + 控件），一行两个 */
export const SearchFilterField: React.FC<{ children: React.ReactNode; label: string }> = ({ children, label }) => (
    <label className="ds-filter-field">
        <span>{label}</span>
        {children}
    </label>
);

/** 供面板内 DatePicker 使用，保证下拉挂载在 Popover 内部避免点击时面板关闭 */
export const getFilterPopupContainer = (trigger: HTMLElement): HTMLElement =>
    (trigger.closest('.ant-popover-inner') as HTMLElement) || (trigger.parentElement as HTMLElement);

/**
 * 统一搜索栏 — v5 风格（大屏项目版，对齐 ABI 各列表页）
 * 搜索输入框占满一行自适应 + 「高级筛选」按钮
 * 高级筛选面板：筛选项一行两个 + 底部重置/查询
 */
export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
    filters,
    onQuery,
    onReset,
    onSearchChange,
    searchPlaceholder = '请输入关键字',
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
        <div className="ds-filter-panel">
            <div className="ds-filter-grid">
                {filters}
                <div className="ds-filter-actions">
                    <Button className="ds-filter-reset" icon={<ReloadOutlined />} onClick={handleReset}>
                        重置
                    </Button>
                    <Button className="ds-filter-query" type="primary" onClick={handleQuery}>
                        <SearchOutlined /> 查询
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="abi-search-row" style={{ width: '100%' }}>
            <Input
                allowClear
                className="abi-field-input"
                style={{ flex: 1, minWidth: 0 }}
                placeholder={searchPlaceholder}
                prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
                value={searchValue}
                onChange={(e) => handleSearchChange(e.target.value)}
                onPressEnter={handleQuery}
            />
            {filters ? (
                <Popover content={panelContent} open={open} placement="bottomRight" trigger="click" onOpenChange={setOpen}>
                    <Button className="ds-filter-btn" icon={<FilterOutlined />}>
                        高级筛选
                        <DownOutlined className={`ds-filter-arrow ${open ? 'ds-filter-arrow-open' : ''}`} />
                    </Button>
                </Popover>
            ) : null}
        </div>
    );
};

export default SearchFilterBar;
