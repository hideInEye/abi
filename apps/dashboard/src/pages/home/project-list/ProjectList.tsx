/*
 * Copyright © 2023-2025 puyinzhen
 * All rights reserved.
 *
 * The copyright of this work (or idea/project/document) is owned by puyinzhen. Without explicit written permission, no part of this work may be reproduced, distributed, or modified in any form for commercial purposes.
 *
 * This copyright statement applies to, but is limited to: concept descriptions, design documents, source code, images, presentation files, and any related content.
 *
 * For permission to use this work or any part of it, please contact 1182810784@qq.com to obtain written authorization.
 */

import React, {memo, useEffect, useRef, useState} from 'react';
import './ProjectList.less';
import {Button, Empty, Input, Select, Table, Dropdown, Popconfirm, Modal, DatePicker, ConfigProvider} from "antd";
import {
    LeftOutlined, PlusOutlined, RightOutlined,
    DeleteOutlined, EditOutlined, EyeOutlined, CopyOutlined,
    DownOutlined, AppstoreOutlined, UnorderedListOutlined, MoreOutlined, SettingOutlined
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import type {Dayjs} from 'dayjs';
import {DesignerMode, IPage, IProjectInfo, SaveType} from "../../../designer/DesignerType";
import {INewProjectInfo, NewProjectDialog} from "./NewProjectDialog.tsx";
import {globalMessage} from "../../../framework/message/GlobalMessage";
import DelProjectDialog from "./DelProjectDialog.tsx";
import CloneProjectDialog from "./CloneProjectDialog.tsx";
import baseApi from "../../../api/BaseApi.ts";
import URLUtil from "../../../utils/URLUtil.ts";
import {SearchFilterBar, SearchFilterField, getFilterPopupContainer} from "./SearchFilterBar.tsx";

export interface ProjectListProps {
    saveType: SaveType;
    statusFilter?: string;
    title?: string;
}

export const ProjectList = memo((props: ProjectListProps) => {
    const {saveType, statusFilter, title = '项目列表'} = props;
    const [addDialog, setAddDialog] = React.useState(false);
    const [delDialog, setDelDialog] = React.useState(false);
    const [cloneDialog, setCloneDialog] = React.useState(false);
    const delIdRef = useRef<string>("");
    const cloneIdRef = useRef<string>("");
    const [pageData, setPageData] = React.useState<IPage<IProjectInfo>>({
        records: [],
        total: 0,
        current: 1,
        size: 12
    });

    // v5 pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);
    const [jumpValue, setJumpValue] = useState('');

    // v5 view mode and selection state
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

    // v5 column picker state
    const [columnOptions, setColumnOptions] = useState([
        { key: 'name', label: '项目名称', visible: true },
        { key: 'status', label: '状态', visible: true },
        { key: 'createTime', label: '创建时间', visible: true },
        { key: 'updateTime', label: '更新时间', visible: true },
    ]);
    const [colPickerOpen, setColPickerOpen] = useState(false);
    const colPickerRef = useRef<HTMLDivElement>(null);

    // Close column picker on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (colPickerRef.current && !colPickerRef.current.contains(e.target as Node)) {
                setColPickerOpen(false);
            }
        }
        if (colPickerOpen) {
            document.addEventListener('mousedown', handleClick);
        }
        return () => document.removeEventListener('mousedown', handleClick);
    }, [colPickerOpen]);

    const visibleKeys = React.useMemo(() => new Set(columnOptions.filter(c => c.visible).map(c => c.key)), [columnOptions]);
    const handleColumnToggle = (key: string, visible: boolean) => {
        setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
    };

    // Rename modal state
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renameId, setRenameId] = useState('');
    const [renameValue, setRenameValue] = useState('');
    const [renameLoading, setRenameLoading] = useState(false);

    const getProjectPageList = (current: number, size: number, keywords?: string) => {
        const spaceId = Number(localStorage.getItem('spaceId')) || undefined;
        baseApi.getProjectInfoPageList({
            current,
            size,
            keywords,
            spaceId,
        }).then((data: IPage<IProjectInfo>) => {
            if (statusFilter !== undefined) {
                data.records = data.records.filter((item: IProjectInfo) => String(item.status) === statusFilter);
            }
            setPageData(data);
            setSelectedRowKeys([]); // Clear selection on data refresh
        });
    }


    const toggleNewProVisible = () => setAddDialog(!addDialog);

    const onOk = async (data: INewProjectInfo) => {
        const {name, des, width, height} = data;
        const spaceId = Number(localStorage.getItem('spaceId'));
        try {
            // 1. 创建大屏项目（名称唯一性校验由后端在创建接口内完成，前端不再预校验）
            const project: IProjectInfo = {
                name: name,
                des: des,
                dataJson: JSON.stringify({canvasManager: {width, height}}),
                spaceId: spaceId,
            };
            const id = await baseApi.createProject(project);
            if (id === "") {
                // 创建失败的错误信息（如名称已存在）已由 createProject 内部按后端 msg 提示
                return;
            }

            // 2. 为新建大屏创建对话会话（每个大屏 = 一个独立会话），并把会话标识写入项目 dataJson，
            //    供大屏 AI 面板发送对话（chat/completions）与拉取历史（/abi-chat/v1/app/message/query）复用。
            //    会话创建失败不阻塞大屏创建，后续可在对话面板按需补建。
            try {
                let userId = 0;
                try {
                    const info = localStorage.getItem('SOY-REACT_userInfo');
                    if (info) {
                        const uid = JSON.parse(info)?.userId;
                        userId = uid != null ? Number(uid) : 0;
                    }
                } catch { /* ignore */ }
                const session = await baseApi.addChatSession({spaceId, userId, title: name});
                if (session) {
                    await baseApi.updateProject({
                        id,
                        dataJson: JSON.stringify({canvasManager: {width, height}, chatId: session.sessionId, convUid: session.convUid}),
                    });
                }
            } catch (sessionErr) {
                console.warn('大屏会话创建失败，将在对话面板按需补建:', sessionErr);
            }

            setAddDialog(false);
            URLUtil.navigateToAppPath('/designer', {id, saveType, mode: DesignerMode.EDIT});
        } catch (e) {
            console.error('创建项目失败:', e);
            globalMessage.messageApi?.error('创建失败');
        }
    }

    const onCancel = () => setAddDialog(false);

    const operateHandler = (id: string, type: string) => {
        switch (type) {
            case 'edit':
                URLUtil.navigateToAppPath('/designer', {id, saveType, mode: DesignerMode.EDIT});
                break;
            case 'show':
                window.open(URLUtil.buildAppUrl('/view', {id, saveType, mode: DesignerMode.VIEW}), '_blank');
                break;
            case 'del':
                delIdRef.current = id;
                setDelDialog(true);
                break;
            case 'clone':
                cloneIdRef.current = id;
                setCloneDialog(true);
                break;
        }
    }

    const cancelDel = () => setDelDialog(false);

    const confirmClone = () => {
        baseApi.copyProject(cloneIdRef.current).then((id) => {
            if (id !== "") {
                setCloneDialog(false);
                getProjectPageList(pageData.current, pageData.size);
                globalMessage.messageApi?.success('克隆成功');
            } else {
                globalMessage.messageApi?.error('克隆失败');
            }
        });
    }

    const cancelClone = () => setCloneDialog(false);

    const confirmDel = async () => {
        const id = delIdRef.current;
        baseApi.deleteProject(id).then((res) => {
            if (res) {
                setDelDialog(false);
                getProjectPageList(pageData.current, pageData.size);
                globalMessage.messageApi?.success('删除成功');
                // 删除=已删除(0)：同步分享记录应用状态
                baseApi.syncShareAppStatus(id, 0);
            } else {
                globalMessage.messageApi?.error('删除失败');
            }
        });
    }

    // Batch delete handler
    const handleBatchDelete = async () => {
        if (selectedRowKeys.length === 0) {
            globalMessage.messageApi?.warning('请先选择要删除的项目');
            return;
        }
        try {
            // Delete each selected project
            for (const id of selectedRowKeys) {
                await baseApi.deleteProject(String(id));
                baseApi.syncShareAppStatus(id as number | string, 0);
            }
            globalMessage.messageApi?.success(`成功删除 ${selectedRowKeys.length} 个项目`);
            setSelectedRowKeys([]);
            getProjectPageList(currentPage, pageSize, searchKeyword);
        } catch (e) {
            console.error('批量删除失败:', e);
            globalMessage.messageApi?.error('批量删除失败');
        }
    };

    const pageChange = (page: number, size: number) => {
        const spaceId = Number(localStorage.getItem('spaceId')) || undefined;
        baseApi.getProjectInfoPageList({
            current: page,
            size: size,
            spaceId,
        }).then((data: IPage<IProjectInfo>) => {
            if (statusFilter !== undefined) {
                data.records = data.records.filter((item: IProjectInfo) => String(item.status) === statusFilter);
            }
            setPageData({...data, current: page, size});
            setCurrentPage(page);
            setPageSize(size);
            setSelectedRowKeys([]); // Clear selection on page change
        });
    }

    // v5 custom pagination helpers
    const totalCount = pageData.total || 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    const handlePrev = () => {
        if (currentPage > 1) pageChange(currentPage - 1, pageSize);
    };
    const handleNext = () => {
        if (currentPage < totalPages) pageChange(currentPage + 1, pageSize);
    };
    const handleJump = () => {
        const p = parseInt(jumpValue, 10);
        if (p >= 1 && p <= totalPages) pageChange(p, pageSize);
        setJumpValue('');
    };

    const renderPageNumbers = () => {
        const pages: number[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push(-1); // ellipsis
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push(-2); // ellipsis
            pages.push(totalPages);
        }
        return pages.map(p => {
            if (p < 0) return <span key={p} className="page-item page-ellipsis">...</span>;
            return (
                <span
                    key={p}
                    className={`page-item${p === currentPage ? ' page-active' : ''}`}
                    onClick={() => pageChange(p, pageSize)}
                >
                    {p}
                </span>
            );
        });
    };

    const runQuery = (overrides?: {keyword?: string; range?: [Dayjs | null, Dayjs | null] | null}) => {
        const kw = overrides?.keyword !== undefined ? overrides.keyword : searchKeyword;
        const range = overrides?.range !== undefined ? overrides.range : dateRange;
        const startTime = range?.[0] ? range[0].startOf('day').format('YYYY-MM-DD HH:mm:ss') : undefined;
        const endTime = range?.[1] ? range[1].endOf('day').format('YYYY-MM-DD HH:mm:ss') : undefined;
        const spaceId = Number(localStorage.getItem('spaceId')) || undefined;
        baseApi.getProjectInfoPageList({
            current: 1,
            size: pageSize,
            keywords: kw,
            spaceId,
            startTime,
            endTime,
        }).then((data: IPage<IProjectInfo>) => {
            if (statusFilter !== undefined) {
                data.records = data.records.filter((item: IProjectInfo) => String(item.status) === statusFilter);
            }
            setPageData({...data, current: 1});
            setCurrentPage(1);
            setSelectedRowKeys([]);
        });
    }

    const handleReset = () => {
        setSearchKeyword('');
        setDateRange(null);
        runQuery({keyword: '', range: null});
    };

    // ── Rename handlers ──
    const openRename = (id: string, currentName: string) => {
        setRenameId(id);
        setRenameValue(currentName);
        setRenameModalVisible(true);
    };

    const handleRenameConfirm = async () => {
        const nextName = renameValue.trim();
        if (!nextName) {
            globalMessage.messageApi?.warning('请输入项目名称');
            return;
        }
        setRenameLoading(true);
        try {
            // 名称唯一性校验由后端在更新接口内完成；失败时错误信息由 updateProject 内部提示，保留弹窗供用户修改
            const ok = await baseApi.updateProject({id: renameId, name: nextName});
            if (ok) {
                setRenameModalVisible(false);
                getProjectPageList(currentPage, pageSize, searchKeyword);
                globalMessage.messageApi?.success('重命名成功');
            }
        } finally {
            setRenameLoading(false);
        }
    };

    useEffect(() => {
        getProjectPageList(pageData.current, pageData.size);
    }, []);

    // 主应用顶部切换空间时，大屏微应用会广播该事件；重置筛选并回到第 1 页按新空间重新拉取
    useEffect(() => {
        const handleSpaceChange = () => {
            setSearchKeyword('');
            setDateRange(null);
            setCurrentPage(1);
            getProjectPageList(1, pageSize);
        };
        window.addEventListener('abi-dashboard:space-change', handleSpaceChange);
        return () => window.removeEventListener('abi-dashboard:space-change', handleSpaceChange);
    }, [pageSize, statusFilter]);

    // Table columns for list view — v5 style with minWidth, col-first-data
    const tableColumns = [
        {
            align: 'left' as const,
            className: 'col-project-name col-first-data',
            dataIndex: 'name',
            key: 'name',
            minWidth: 180,
            onHeaderCell: () => ({ className: 'col-project-name col-first-data' }),
            render: (text: string) => <span style={{ fontWeight: 600, color: '#1a2744' }}>{text}</span>,
            title: '项目名称',
        },
        {
            align: 'center' as const,
            dataIndex: 'status',
            key: 'status',
            minWidth: 100,
            render: (status: string) => {
                const statusMap: Record<string, { text: string; cls: string }> = {
                    '0': { text: '当前启用', cls: 'status-published' },
                    '1': { text: '编辑中', cls: 'status-draft' },
                    '2': { text: '历史版本', cls: 'status-sealed' },
                };
                const st = statusMap[status] || { text: '-', cls: '' };
                return <span className={`abi-status-tag ${st.cls}`}>{st.text}</span>;
            },
            title: '状态',
        },
        {
            align: 'center' as const,
            dataIndex: 'createTime',
            key: 'createTime',
            minWidth: 160,
            title: '创建时间',
        },
        {
            align: 'center' as const,
            dataIndex: 'updateTime',
            key: 'updateTime',
            minWidth: 160,
            title: '更新时间',
        },
        {
            align: 'center' as const,
            fixed: 'right' as const,
            key: 'action',
            minWidth: 200,
            render: (_: any, record: IProjectInfo) => (
                <div className="ds-action-group">
                    <Button
                        className="abi-action-link"
                        size="small"
                        type="link"
                        onClick={() => operateHandler(record.id!, 'edit')}
                    >
                        <EditOutlined style={{ marginRight: 3, fontSize: 12 }} />编辑
                    </Button>
                    <Button
                        className="abi-action-link"
                        size="small"
                        type="link"
                        onClick={() => operateHandler(record.id!, 'show')}
                    >
                        <EyeOutlined style={{ marginRight: 3, fontSize: 12 }} />预览
                    </Button>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'rename',
                                    label: <span><EditOutlined style={{ marginRight: 4 }} />重命名</span>,
                                    onClick: () => openRename(record.id!, record.name!),
                                },
                                {
                                    key: 'clone',
                                    label: <span><CopyOutlined style={{ marginRight: 4 }} />复制</span>,
                                    onClick: () => operateHandler(record.id!, 'clone'),
                                },
                                { type: 'divider' },
                                {
                                    key: 'delete',
                                    danger: true,
                                    label: (
                                        <Popconfirm
                                            title="确定要删除该项目吗？"
                                            onConfirm={() => operateHandler(record.id!, 'del')}
                                        >
                                            <span><DeleteOutlined style={{ marginRight: 4 }} />删除</span>
                                        </Popconfirm>
                                    ),
                                },
                            ],
                        }}
                    >
                        <Button className="abi-action-link" size="small" type="link">
                            更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
                        </Button>
                    </Dropdown>
                </div>
            ),
            title: '操作',
        },
    ];

    // Filter columns by visibility (always keep action column)
    const filteredColumns = React.useMemo(() => {
        return tableColumns.filter((col: any) => col.key === 'action' || visibleKeys.has(col.key));
    }, [visibleKeys]);

    // v5 card grid render
    const renderCardGrid = () => {
        const records = pageData.records || [];
        if (records.length === 0) {
            return (
                <div className="abi-card-empty">
                    <Empty description="暂无大屏" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                </div>
            );
        }

        return (
            <div className="abi-card-grid">
                <div className="abi-card-grid-inner">
                    {records.map((item: IProjectInfo) => (
                        <div key={item.id} className="abi-data-card">
                            <div className="abi-data-card-head">
                                <div className="abi-data-card-title">
                                    <span className="abi-data-card-name" title={item.name!}>{item.name}</span>
                                </div>
                                <span className={`abi-status-tag ${String(item.status) === '0' ? 'status-published' : String(item.status) === '2' ? 'status-sealed' : 'status-draft'}`}>
                                    {String(item.status) === '0' ? '当前启用' : String(item.status) === '2' ? '历史版本' : '编辑中'}
                                </span>
                            </div>

                            <div className="abi-data-card-body">
                                {visibleKeys.has('status') && (
                                    <div className="row"><span className="lbl">状态</span><span className="val">
                                        <span className={`abi-status-tag ${String(item.status) === '0' ? 'status-published' : String(item.status) === '2' ? 'status-sealed' : 'status-draft'}`}>
                                            {String(item.status) === '0' ? '当前启用' : String(item.status) === '2' ? '历史版本' : '编辑中'}
                                        </span>
                                    </span></div>
                                )}
                                {visibleKeys.has('createTime') && (
                                    <div className="row"><span className="lbl">创建时间</span><span className="val">{item.createTime || '-'}</span></div>
                                )}
                                {visibleKeys.has('updateTime') && (
                                    <div className="row"><span className="lbl">更新时间</span><span className="val">{item.updateTime || '-'}</span></div>
                                )}
                            </div>

                            <div className="abi-data-card-footer">
                                <button className="abi-card-act" onClick={() => operateHandler(item.id!, 'edit')}>
                                    <EditOutlined style={{ marginRight: 3 }} />编辑
                                </button>
                                <button className="abi-card-act" onClick={() => operateHandler(item.id!, 'show')}>
                                    <EyeOutlined style={{ marginRight: 3 }} />预览
                                </button>
                                <Dropdown
                                    menu={{
                                        items: [
                                            {
                                                key: 'rename',
                                                label: '重命名',
                                                onClick: () => openRename(item.id!, item.name!),
                                            },
                                            {
                                                key: 'clone',
                                                label: '复制',
                                                onClick: () => operateHandler(item.id!, 'clone'),
                                            },
                                            { type: 'divider' },
                                            {
                                                key: 'delete',
                                                danger: true,
                                                label: '删除',
                                                onClick: () => operateHandler(item.id!, 'del'),
                                            },
                                        ],
                                    }}
                                    trigger={['click']}
                                >
                                    <button className="abi-card-more" onClick={(e) => e.stopPropagation()}>
                                        <MoreOutlined />
                                    </button>
                                </Dropdown>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className={'project-list-container'}>
            {/* v5 Searchbar */}
            <section className="abi-searchbar">
                <SearchFilterBar
                    searchPlaceholder="搜索项目名称"
                    searchValue={searchKeyword}
                    onSearchChange={setSearchKeyword}
                    onQuery={() => runQuery()}
                    onReset={handleReset}
                    filters={
                        <SearchFilterField label="创建时间">
                            <ConfigProvider locale={zhCN}>
                                <DatePicker.RangePicker
                                    allowClear
                                    className="abi-field-input"
                                    style={{width: '100%'}}
                                    format="YYYY-MM-DD"
                                    getPopupContainer={getFilterPopupContainer}
                                    placeholder={['开始时间', '结束时间']}
                                    value={dateRange}
                                    onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
                                />
                            </ConfigProvider>
                        </SearchFilterField>
                    }
                />
            </section>

            {/* v5 Data Area */}
            <section className="abi-data-area">
                <div className="abi-toolbar">
                    <div className="abi-toolbar-left">
                        {!statusFilter && (
                            <Button className="btn-accent-gradient" onClick={toggleNewProVisible}>
                                <PlusOutlined />新增大屏
                            </Button>
                        )}
                        <Popconfirm
                            title="确定要批量删除选中的项目吗？"
                            onConfirm={handleBatchDelete}
                            disabled={selectedRowKeys.length === 0}
                        >
                            <Button
                                danger
                                disabled={selectedRowKeys.length === 0}
                            >
                                <DeleteOutlined /> 批量删除{selectedRowKeys.length ? `(${selectedRowKeys.length})` : ''}
                            </Button>
                        </Popconfirm>
                    </div>
                    <div className="abi-toolbar-right">
                        <div className="abi-view-toggle">
                            <button
                                className={`abi-vt-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                                title="列表视图"
                            >
                                <UnorderedListOutlined />
                            </button>
                            <button
                                className={`abi-vt-btn ${viewMode === 'card' ? 'active' : ''}`}
                                onClick={() => setViewMode('card')}
                                title="卡片视图"
                            >
                                <AppstoreOutlined />
                            </button>
                        </div>
                        <div className="abi-col-picker" ref={colPickerRef}>
                            <button className="abi-col-picker-btn" onClick={() => setColPickerOpen(!colPickerOpen)}>
                                <SettingOutlined />
                                列设置
                                <DownOutlined style={{ fontSize: 11, transition: 'transform 0.2s', transform: colPickerOpen ? 'rotate(180deg)' : 'none' }} />
                            </button>
                            {colPickerOpen && (
                                <div className="abi-col-dropdown">
                                    {columnOptions.map(col => (
                                        <label key={col.key}>
                                            <input
                                                type="checkbox"
                                                checked={col.visible}
                                                onChange={e => handleColumnToggle(col.key, e.target.checked)}
                                            />
                                            {col.label}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content: table or cards */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    {viewMode === 'list' ? (
                        <div
                            style={{
                                border: '1px solid rgba(130,140,200,0.18)',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                flex: 1,
                                minHeight: 0,
                            }}
                        >
                            <div className="abi-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
                                <Table
                                    columns={filteredColumns as any}
                                    dataSource={pageData.records}
                                    rowKey="id"
                                    pagination={false}
                                    rowSelection={{
                                        fixed: true,
                                        selectedRowKeys,
                                        onChange: (keys) => setSelectedRowKeys(keys),
                                    }}
                                    scroll={pageData.records.length > 0 ? { x: 'max-content' } : undefined}
                                    size="middle"
                                    locale={{
                                        emptyText: (
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                                                <Empty description="暂无大屏" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                                            </div>
                                        ),
                                    }}
                                    className="project-table abi-std-table"
                                />
                            </div>
                        </div>
                    ) : (
                        renderCardGrid()
                    )}

                    <div className="data-source-pagination">
                    <span className="total-text">共 {totalCount} 条</span>
                    <div className="pagination-controls">
                        <Select
                            value={pageSize}
                            onChange={(val: number) => { setPageSize(val); setCurrentPage(1); pageChange(1, val); }}
                            options={[
                                { label: '12条/页', value: 12 },
                                { label: '18条/页', value: 18 },
                                { label: '24条/页', value: 24 },
                                { label: '30条/页', value: 30 },
                            ]}
                            className="page-size-select"
                        />
                        <button className="page-btn" disabled={currentPage === 1} onClick={handlePrev}>
                            <LeftOutlined />
                        </button>
                        {renderPageNumbers()}
                        <button className="page-btn" disabled={currentPage === totalPages} onClick={handleNext}>
                            <RightOutlined />
                        </button>
                        <span className="quick-jumper">
                            前往
                            <Input
                                className="jump-input"
                                style={{ width: 48, textAlign: 'center' }}
                                value={jumpValue}
                                onChange={(e: any) => setJumpValue(e.target.value)}
                                onPressEnter={handleJump}
                            />
                            页
                        </span>
                    </div>
                </div>
                </div>
            </section>

            <NewProjectDialog onOk={onOk} onCancel={onCancel} visible={addDialog}/>
            <DelProjectDialog visible={delDialog} onOk={confirmDel} onCancel={cancelDel}/>
            <CloneProjectDialog onOk={() => confirmClone()} onCancel={cancelClone}
                                visible={cloneDialog}/>

            {/* Rename Modal */}
            <Modal
                title="重命名大屏"
                open={renameModalVisible}
                onCancel={() => setRenameModalVisible(false)}
                onOk={handleRenameConfirm}
                okText="确定"
                cancelText="取消"
                confirmLoading={renameLoading}
                width={420}
                centered
            >
                <Input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onPressEnter={handleRenameConfirm}
                    placeholder="请输入项目名称"
                    maxLength={50}
                />
            </Modal>

        </div>
    );
})

export default ProjectList;
