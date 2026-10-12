import React, {memo, useEffect, useRef, useState} from 'react';
import type {Dayjs} from 'dayjs';
import {Button, Popconfirm} from 'antd';
import {AppstoreOutlined, DeleteOutlined, DownOutlined, PlusOutlined, SettingOutlined, UnorderedListOutlined} from '@ant-design/icons';

import {LazyFeatureFallback, RetryableLazy} from '../../../runtime/RetryableLazy';
import {SearchFilterBar} from './SearchFilterBar';

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
    onBatchDelete: () => void | Promise<void>;
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

    return (
        <div className="project-list-container">
            <section className="abi-searchbar">
                <SearchFilterBar
                    searchPlaceholder="搜索项目名称"
                    searchValue={searchKeyword}
                    onSearchChange={onSearchChange}
                    onQuery={onSearchSubmit}
                    onReset={onReset}
                    filters={
                        <RetryableLazy
                            loader={loadDateRangeFilter}
                            componentProps={{onChange: onDateRangeChange, value: dateRange}}
                            fallback={<LazyFeatureFallback label="正在加载日期筛选…" style={{height: 64, minHeight: 64, width: '100%'}}/>}
                        />
                    }
                />
            </section>

            <section className="abi-data-area">
                <div className="abi-toolbar">
                    <div className="abi-toolbar-left">
                        {!statusFilter ? (
                            <Button
                                className="btn-accent-gradient"
                                onClick={onNewProject}
                                onFocus={onPreloadNewProject}
                                onMouseEnter={onPreloadNewProject}
                            >
                                <PlusOutlined/>新增大屏
                            </Button>
                        ) : null}
                        <Popconfirm
                            title="确定要批量删除选中的项目吗？"
                            onConfirm={onBatchDelete}
                            disabled={selectedCount === 0}
                        >
                            <Button danger disabled={selectedCount === 0}>
                                <DeleteOutlined/> 批量删除{selectedCount ? `(${selectedCount})` : ''}
                            </Button>
                        </Popconfirm>
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
                                <UnorderedListOutlined/>
                            </button>
                            <button
                                className={`abi-vt-btn ${viewMode === 'card' ? 'active' : ''}`}
                                onClick={() => onViewModeChange('card')}
                                title="卡片视图"
                                type="button"
                            >
                                <AppstoreOutlined/>
                            </button>
                        </div>
                        <div className="abi-col-picker" ref={colPickerRef}>
                            <button className="abi-col-picker-btn" onClick={() => setColPickerOpen(open => !open)} type="button">
                                <SettingOutlined/>
                                列设置
                                <DownOutlined style={{fontSize: 11, transform: colPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s'}}/>
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
