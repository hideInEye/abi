import React, {memo, useCallback, useEffect, useMemo, useState} from 'react';
import type {Dayjs} from 'dayjs';

import type {IProjectInfo} from '../../../designer/DesignerType';
import {LazyFeatureFallback, RetryableLazy} from '../../../runtime/RetryableLazy';
import type {ProjectListColumnOption} from './ProjectListControls';

const loadProjectListCardView = () => import('./ProjectListCardView');
const loadProjectListControls = () => import('./ProjectListControls');
const loadProjectListTableView = () => import('./ProjectListTableView');

export interface ProjectListViewProps {
    currentPage: number;
    dateRange: [Dayjs | null, Dayjs | null] | null;
    listError: string;
    listLoading: boolean;
    onApplyFilters: () => void;
    onBatchDelete: () => void;
    onDateRangeChange: (value: [Dayjs | null, Dayjs | null] | null) => void;
    onNewProject: () => void;
    onOperate: (id: string, type: string) => void;
    onPageChange: (page: number, size: number) => void;
    onPreloadNewProject: () => void;
    onRename: (id: string, currentName: string) => void;
    onReset: () => void;
    onRetry: () => void;
    onSearchChange: (value: string) => void;
    onSearchSubmit: () => void;
    onSelectionChange: (keys: React.Key[]) => void;
    pageSize: number;
    records: IProjectInfo[];
    searchKeyword: string;
    selectedRowKeys: React.Key[];
    statusFilter?: string;
    totalCount: number;
}

const initialColumnOptions: ProjectListColumnOption[] = [
    {key: 'name', label: '项目名称', visible: true},
    {key: 'status', label: '状态', visible: true},
    {key: 'createTime', label: '创建时间', visible: true},
    {key: 'updateTime', label: '更新时间', visible: true},
];

const ProjectListView = memo((props: ProjectListViewProps) => {
    const {
        currentPage,
        dateRange,
        listError,
        listLoading,
        onApplyFilters,
        onBatchDelete,
        onDateRangeChange,
        onNewProject,
        onOperate,
        onPageChange,
        onPreloadNewProject,
        onRename,
        onReset,
        onRetry,
        onSearchChange,
        onSearchSubmit,
        onSelectionChange,
        pageSize,
        records,
        searchKeyword,
        selectedRowKeys,
        statusFilter,
        totalCount,
    } = props;
    const [columnOptions, setColumnOptions] = useState(initialColumnOptions);
    const [contentReady, setContentReady] = useState(false);
    const [controlsReady, setControlsReady] = useState(false);
    const [jumpValue, setJumpValue] = useState('');
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

    const handleControlsReady = useCallback(() => setControlsReady(true), []);

    useEffect(() => {
        if (!controlsReady) return undefined;
        const timer = window.setTimeout(() => setContentReady(true), 0);
        return () => window.clearTimeout(timer);
    }, [controlsReady]);

    const visibleKeys = useMemo(
        () => columnOptions.filter(column => column.visible).map(column => column.key),
        [columnOptions],
    );
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const pageNumbers: number[] = [];
    if (totalPages <= 7) {
        for (let page = 1; page <= totalPages; page += 1) pageNumbers.push(page);
    } else {
        pageNumbers.push(1);
        if (currentPage > 3) pageNumbers.push(-1);
        for (let page = Math.max(2, currentPage - 1); page <= Math.min(totalPages - 1, currentPage + 1); page += 1) {
            pageNumbers.push(page);
        }
        if (currentPage < totalPages - 2) pageNumbers.push(-2);
        pageNumbers.push(totalPages);
    }

    const handleJump = () => {
        const page = Number.parseInt(jumpValue, 10);
        if (page >= 1 && page <= totalPages) onPageChange(page, pageSize);
        setJumpValue('');
    };

    const content = contentReady ? (
        <>
            {listError ? (
                <div className="project-list-alert" role="alert">
                    <span>{listError}</span>
                    <button type="button" onClick={onRetry}>重新加载</button>
                </div>
            ) : null}
            <div style={{display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden'}}>
                {viewMode === 'list' ? (
                    <RetryableLazy
                        loader={loadProjectListTableView}
                        componentProps={{
                            loading: listLoading,
                            onOperate,
                            onRename,
                            onSelectionChange,
                            records,
                            selectedRowKeys,
                            visibleKeys,
                        }}
                        fallback={<LazyFeatureFallback label="正在加载列表视图…" style={{minHeight: 240, width: '100%'}}/>}
                    />
                ) : (
                    <div aria-busy={listLoading} className="project-card-loading-wrap">
                        {records.length > 0 ? (
                            <RetryableLazy
                                loader={loadProjectListCardView}
                                componentProps={{onOperate, onRename, records, visibleKeys}}
                                fallback={<LazyFeatureFallback label="正在加载卡片视图…" style={{minHeight: 240, width: '100%'}}/>}
                            />
                        ) : (
                            <div className="abi-card-empty">
                                <div className="my-screen-empty-state">
                                    <span className="my-screen-empty-icon" aria-hidden="true">▦</span>
                                    <span>{listLoading ? '正在加载大屏…' : '暂无大屏'}</span>
                                </div>
                            </div>
                        )}
                        {listLoading && records.length > 0 ? <div className="project-card-loading-indicator">正在刷新…</div> : null}
                    </div>
                )}

                <div className="data-source-pagination">
                    <span className="total-text">共 {totalCount} 条</span>
                    <div className="pagination-controls">
                        <select
                            aria-label="每页条数"
                            className="page-size-select"
                            value={pageSize}
                            onChange={event => onPageChange(1, Number(event.target.value))}
                        >
                            <option value={12}>12条/页</option>
                            <option value={18}>18条/页</option>
                            <option value={24}>24条/页</option>
                            <option value={30}>30条/页</option>
                        </select>
                        <button className="page-btn" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1, pageSize)} type="button">
                            <span aria-hidden="true">‹</span>
                        </button>
                        {pageNumbers.map(page => page < 0 ? (
                            <span key={page} className="page-item page-ellipsis">...</span>
                        ) : (
                            <button
                                key={page}
                                className={`page-item${page === currentPage ? ' page-active' : ''}`}
                                onClick={() => onPageChange(page, pageSize)}
                                type="button"
                            >
                                {page}
                            </button>
                        ))}
                        <button className="page-btn" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1, pageSize)} type="button">
                            <span aria-hidden="true">›</span>
                        </button>
                        <span className="quick-jumper">
                            前往
                            <input
                                aria-label="跳转页码"
                                className="jump-input"
                                max={totalPages}
                                min={1}
                                style={{width: 48, textAlign: 'center'}}
                                type="number"
                                value={jumpValue}
                                onChange={event => setJumpValue(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter') handleJump();
                                }}
                            />
                            页
                        </span>
                    </div>
                </div>
            </div>
        </>
    ) : (
        <LazyFeatureFallback label="正在加载项目数据…" style={{flex: 1, minHeight: 240, width: '100%'}}/>
    );

    return (
        <RetryableLazy
            loader={loadProjectListControls}
            componentProps={{
                children: content,
                columnOptions,
                dateRange,
                onApplyFilters,
                onBatchDelete,
                onColumnToggle: (key: string, visible: boolean) => {
                    setColumnOptions(options => options.map(option => option.key === key ? {...option, visible} : option));
                },
                onDateRangeChange,
                onNewProject,
                onPreloadNewProject,
                onReady: handleControlsReady,
                onReset,
                onSearchChange,
                onSearchSubmit,
                onViewModeChange: setViewMode,
                searchKeyword,
                selectedCount: selectedRowKeys.length,
                statusFilter,
                viewMode,
            }}
            fallback={<LazyFeatureFallback label="正在准备项目操作区…" style={{height: '100%', minHeight: 320, width: '100%'}}/>}
        />
    );
});

export default ProjectListView;
