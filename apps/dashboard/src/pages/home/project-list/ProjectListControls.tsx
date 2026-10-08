import React, {memo, useEffect, useRef, useState} from 'react';
import type {Dayjs} from 'dayjs';

import {LazyFeatureFallback, RetryableLazy} from '../../../runtime/RetryableLazy';

const loadDateRangeFilter = () => import('../../my-screen/MyScreenDateRangeFilter');
const loadProjectListTableView = () => import('./ProjectListTableView');

export interface ProjectListColumnOption {
    key: string;
    label: string;
    visible: boolean;
}

export interface ProjectListControlsProps {
    children: React.ReactNode;
    columnOptions: ProjectListColumnOption[];
    dateRange: [Dayjs | null, Dayjs | null] | null;
    onApplyFilters: () => void;
    onBatchDelete: () => void;
    onColumnToggle: (key: string, visible: boolean) => void;
    onDateRangeChange: (value: [Dayjs | null, Dayjs | null] | null) => void;
    onNewProject: () => void;
    onPreloadNewProject: () => void;
    onReady: () => void;
    onReset: () => void;
    onSearchChange: (value: string) => void;
    onSearchSubmit: () => void;
    onViewModeChange: (mode: 'card' | 'list') => void;
    searchKeyword: string;
    selectedCount: number;
    statusFilter?: string;
    viewMode: 'card' | 'list';
}

const ProjectListControls = memo((props: ProjectListControlsProps) => {
    const {
        children,
        columnOptions,
        dateRange,
        onApplyFilters,
        onBatchDelete,
        onColumnToggle,
        onDateRangeChange,
        onNewProject,
        onPreloadNewProject,
        onReady,
        onReset,
        onSearchChange,
        onSearchSubmit,
        onViewModeChange,
        searchKeyword,
        selectedCount,
        statusFilter,
        viewMode,
    } = props;
    const [colPickerOpen, setColPickerOpen] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const colPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        onReady();
    }, [onReady]);

    useEffect(() => {
        function handleClick(event: MouseEvent) {
            if (colPickerRef.current && !colPickerRef.current.contains(event.target as Node)) {
                setColPickerOpen(false);
            }
        }
        if (colPickerOpen) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [colPickerOpen]);

    const handleReset = () => {
        setFilterOpen(false);
        onReset();
    };

    return (
        <div className="project-list-container">
            <section className="abi-searchbar">
                <div className="abi-search-row">
                    <label className="my-screen-search-control">
                        <span aria-hidden="true">⌕</span>
                        <input
                            aria-label="搜索项目名称"
                            placeholder="搜索项目名称"
                            value={searchKeyword}
                            onChange={event => onSearchChange(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === 'Enter') onSearchSubmit();
                            }}
                        />
                    </label>
                    <div className="my-screen-filter-wrap">
                        <button
                            aria-expanded={filterOpen}
                            className="my-screen-filter-button"
                            onClick={() => setFilterOpen(open => !open)}
                            onFocus={() => void loadDateRangeFilter()}
                            onMouseEnter={() => void loadDateRangeFilter()}
                            type="button"
                        >
                            <span aria-hidden="true">≡</span>
                            高级筛选
                            <span aria-hidden="true" className={filterOpen ? 'my-screen-filter-arrow open' : 'my-screen-filter-arrow'}>⌄</span>
                        </button>
                        {filterOpen ? (
                            <div className="my-screen-filter-panel">
                                <RetryableLazy
                                    loader={loadDateRangeFilter}
                                    componentProps={{onChange: onDateRangeChange, value: dateRange}}
                                    fallback={<LazyFeatureFallback label="正在加载日期筛选…" style={{height: 64, minHeight: 64, width: '100%'}}/>}
                                />
                                <div className="my-screen-filter-actions">
                                    <button type="button" onClick={handleReset}>重置</button>
                                    <button
                                        className="primary"
                                        type="button"
                                        onClick={() => {
                                            setFilterOpen(false);
                                            onApplyFilters();
                                        }}
                                    >
                                        查询
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </section>

            <section className="abi-data-area">
                <div className="abi-toolbar">
                    <div className="abi-toolbar-left">
                        {!statusFilter ? (
                            <button
                                className="btn-accent-gradient"
                                onClick={onNewProject}
                                onFocus={onPreloadNewProject}
                                onMouseEnter={onPreloadNewProject}
                                type="button"
                            >
                                <span aria-hidden="true">＋</span>新增大屏
                            </button>
                        ) : null}
                        <button
                            className="btn-ghost-v5"
                            disabled={selectedCount === 0}
                            onClick={() => {
                                if (window.confirm('确定要批量删除选中的项目吗？')) void onBatchDelete();
                            }}
                            type="button"
                        >
                            <span aria-hidden="true">⌫</span> 批量删除{selectedCount ? `(${selectedCount})` : ''}
                        </button>
                    </div>
                    <div className="abi-toolbar-right">
                        <div className="abi-view-toggle">
                            <button
                                className={`abi-vt-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => {
                                    void loadProjectListTableView();
                                    onViewModeChange('list');
                                }}
                                onFocus={() => void loadProjectListTableView()}
                                onMouseEnter={() => void loadProjectListTableView()}
                                title="列表视图"
                                type="button"
                            >
                                <span aria-hidden="true">☷</span>
                            </button>
                            <button
                                className={`abi-vt-btn ${viewMode === 'card' ? 'active' : ''}`}
                                onClick={() => onViewModeChange('card')}
                                title="卡片视图"
                                type="button"
                            >
                                <span aria-hidden="true">▦</span>
                            </button>
                        </div>
                        <div className="abi-col-picker" ref={colPickerRef}>
                            <button className="abi-col-picker-btn" onClick={() => setColPickerOpen(open => !open)} type="button">
                                <span aria-hidden="true">⚙</span>
                                列设置
                                <span aria-hidden="true" style={{fontSize: 11, transform: colPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}}>⌄</span>
                            </button>
                            {colPickerOpen ? (
                                <div className="abi-col-dropdown">
                                    {columnOptions.map(column => (
                                        <label key={column.key}>
                                            <input
                                                type="checkbox"
                                                checked={column.visible}
                                                onChange={event => onColumnToggle(column.key, event.target.checked)}
                                            />
                                            {column.label}
                                        </label>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
                {children}
            </section>
        </div>
    );
});

export default ProjectListControls;
