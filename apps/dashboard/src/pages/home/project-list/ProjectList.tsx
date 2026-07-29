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
import {Button, Empty, Input, Select, Table, Dropdown, Popconfirm, Modal, Switch, Segmented, DatePicker, ConfigProvider, message} from "antd";
import {
    LeftOutlined, PlusOutlined, RightOutlined,
    DeleteOutlined, EditOutlined, EyeOutlined, CopyOutlined, ShareAltOutlined,
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

    // Share modal state
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [shareProjectId, setShareProjectId] = useState<string>('');
    const [sharePasswordFlag, setSharePasswordFlag] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [sharePassword, setSharePassword] = useState<string | null>('');
    const [shareLoading, setShareLoading] = useState(false);
    const [expirationMode, setExpirationMode] = useState<string>('forever');
    const [expirationDate, setExpirationDate] = useState<Dayjs | null>(null);

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
        const project: IProjectInfo = {
            name: name,
            des: des,
            dataJson: JSON.stringify({canvasManager: {width, height}}),
            spaceId: Number(localStorage.getItem('spaceId')),
        }
        try {
            // 1. 创建大屏项目
            const id = await baseApi.createProject(project);
            if (id === "") {
                globalMessage.messageApi?.error('创建失败');
                return;
            }

            // 2. 获取助手列表，取第一条的 agentId
            const spaceId = Number(localStorage.getItem('spaceId'));
            const agentList = await baseApi.fetchAgentList(spaceId);
            const agentId = agentList?.[0]?.agentId;

            // 3. 获取提示词列表，status 全部设为 '1'（开启），组装 chat_config
            const promptList = await baseApi.fetchRecommendQuestions();
            const promptsWithStatus = promptList.map((p: any) => ({...p, status: '1'}));
            const chatConfig = JSON.stringify({prompts: promptsWithStatus});

            // 4. 验证对话应用名称唯一性
            const nameValid = await baseApi.validateChatAppName(name, spaceId);
            if (!nameValid) {
                globalMessage.messageApi?.error('对话应用名称已存在，请更换后重试');
                return;
            }

            // 5. 创建会话应用
            const userInfoStr = localStorage.getItem('SOY-REACT_userInfo');
            let createBy = '';
            try {
                if (userInfoStr) {
                    createBy = JSON.parse(userInfoStr)?.userName || '';
                }
            } catch { /* ignore */ }

            const chatAppData = {
                biz_name: name,
                status: '1',
                chat_mode: 'chat_with_dashboard',
                space_id: spaceId,
                create_by: createBy,
                chat_config: chatConfig,
                ...(agentId ? {agent_id: String(agentId)} : {}),
            };
            const appRes = await baseApi.createChatApp(chatAppData);

            // 6. 创建会话，并把 chat_id 存入大屏 dataJson
            if (appRes.success && appRes.data) {
                const chatId = appRes.data.data.chat_id;
                await baseApi.createChatConv({
                    chat_id: chatId,
                    chat_mode: 'chat_with_dashboard',
                    space_id: spaceId,
                });
                // 把 chat_id 保存到大屏 dataJson，供 AI 对话面板使用
                await baseApi.updateProject({
                    id,
                    dataJson: JSON.stringify({canvasManager: {width, height}, chatId}),
                });
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
            case 'share':
                setShareProjectId(id);
                setShareModalVisible(true);
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
        try {
            // 1. 查询大屏详情，从 dataJson 取出 chatId，删除关联会话
            const spaceId = Number(localStorage.getItem('spaceId'));
            const projectInfo = await baseApi.getProjectInfo(id);
            const chatId = projectInfo?.dataJson ? JSON.parse(projectInfo.dataJson)?.chatId : null;
            if (chatId) {
                const convList = await baseApi.fetchChatConvList({
                    chat_id: chatId,
                    chat_mode: 'chat_with_dashboard',
                    space_id: spaceId,
                });
                if (convList.length) {
                    await Promise.all(convList.map((conv: any) => baseApi.deleteChatConv(conv.conv_uid)));
                }
            }
        } catch (e) {
            console.error('删除关联会话失败:', e);
        }

        // 2. 删除大屏项目
        baseApi.deleteProject(id).then((res) => {
            if (res) {
                setDelDialog(false);
                getProjectPageList(pageData.current, pageData.size);
                globalMessage.messageApi?.success('删除成功');
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
            const spaceId = Number(localStorage.getItem('spaceId'));
            // Delete each selected project
            for (const id of selectedRowKeys) {
                const projectId = String(id);
                try {
                    const projectInfo = await baseApi.getProjectInfo(projectId);
                    const chatId = projectInfo?.dataJson ? JSON.parse(projectInfo.dataJson)?.chatId : null;
                    if (chatId) {
                        const convList = await baseApi.fetchChatConvList({
                            chat_id: chatId,
                            chat_mode: 'chat_with_dashboard',
                            space_id: spaceId,
                        });
                        if (convList.length) {
                            await Promise.all(convList.map((conv: any) => baseApi.deleteChatConv(conv.conv_uid)));
                        }
                    }
                } catch (e) {
                    console.error('删除关联会话失败:', e);
                }
                await baseApi.deleteProject(projectId);
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

    // ── Share modal handlers ──
    const handleShare = async () => {
        setShareLoading(true);
        try {
            const currentSpaceId = localStorage.getItem('spaceId') || '';
            const expirationDays = ['1', '7', '30'].includes(expirationMode) ? Number(expirationMode) : undefined;
            const expirationDateStr = expirationMode === 'custom' && expirationDate
                ? expirationDate.format('YYYY-MM-DD HH:mm:ss')
                : undefined;
            const res = await baseApi.shareProject(Number(shareProjectId), Number(currentSpaceId), sharePasswordFlag, expirationDays, expirationDateStr);
            if (res?.shareUrl) {
                const shareUrl = res.shareUrl.replace('/#/', '/').replace('/dr/', '/dashboard-share-page/');
                setShareLink(shareUrl);
                setSharePassword(res.sharePassword ?? null);
            }
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyLink = () => {
        const text = sharePassword
            ? `分享链接：${shareLink}\n访问密码：${sharePassword}`
            : shareLink;
        navigator.clipboard.writeText(text).then(() => {
            message.success(sharePassword ? '分享链接和密码已复制到剪贴板' : '分享链接已复制到剪贴板');
        });
    };

    const handleCloseShareModal = () => {
        setShareModalVisible(false);
        setShareLink('');
        setSharePassword(null);
        setSharePasswordFlag(false);
        setExpirationMode('forever');
        setExpirationDate(null);
    };

    useEffect(() => {
        getProjectPageList(pageData.current, pageData.size);
    }, []);

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
                    '0': { text: '草稿', cls: 'status-draft' },
                    '1': { text: '已发布', cls: 'status-published' },
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
                                    key: 'clone',
                                    label: <span><CopyOutlined style={{ marginRight: 4 }} />复制</span>,
                                    onClick: () => operateHandler(record.id!, 'clone'),
                                },
                                {
                                    key: 'share',
                                    label: <span><ShareAltOutlined style={{ marginRight: 4 }} />分享</span>,
                                    onClick: () => operateHandler(record.id!, 'share'),
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
                                <span className={`abi-status-tag ${String(item.status) === '1' ? 'status-published' : 'status-draft'}`}>
                                    {String(item.status) === '1' ? '已发布' : '草稿'}
                                </span>
                            </div>

                            <div className="abi-data-card-body">
                                {visibleKeys.has('status') && (
                                    <div className="row"><span className="lbl">状态</span><span className="val">
                                        <span className={`abi-status-tag ${String(item.status) === '1' ? 'status-published' : 'status-draft'}`}>
                                            {String(item.status) === '1' ? '已发布' : '草稿'}
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
                                                key: 'clone',
                                                label: '复制',
                                                onClick: () => operateHandler(item.id!, 'clone'),
                                            },
                                            {
                                                key: 'share',
                                                label: '分享',
                                                onClick: () => operateHandler(item.id!, 'share'),
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
                                { label: '20条/页', value: 20 },
                                { label: '30条/页', value: 30 },
                                { label: '50条/页', value: 50 },
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

            {/* Share Modal */}
            <Modal
                title="分享大屏项目"
                open={shareModalVisible}
                onCancel={handleCloseShareModal}
                footer={null}
                width={520}
                centered
            >
                <div style={{ padding: '8px 0 4px' }}>
                    {/* 访问密码 */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: '#f7f8fa',
                        borderRadius: '10px',
                        marginBottom: '12px',
                    }}>
                        <div>
                            <div style={{ fontWeight: 500, color: '#262626', marginBottom: '2px' }}>访问密码保护</div>
                            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>开启后将生成随机访问密码</div>
                        </div>
                        <Switch checked={sharePasswordFlag} onChange={setSharePasswordFlag} disabled={!!shareLink} />
                    </div>

                    {/* 链接有效期 */}
                    <div style={{
                        padding: '14px 16px',
                        background: '#f7f8fa',
                        borderRadius: '10px',
                        marginBottom: '20px',
                    }}>
                        <div style={{ fontWeight: 500, color: '#262626', marginBottom: '10px' }}>链接有效期</div>
                        <Segmented
                            value={expirationMode}
                            onChange={(val) => setExpirationMode(String(val))}
                            options={[
                                { label: '永久', value: 'forever' },
                                { label: '1 天', value: '1' },
                                { label: '7 天', value: '7' },
                                { label: '30 天', value: '30' },
                                { label: '自定义', value: 'custom' },
                            ]}
                            block
                        />
                        {expirationMode === 'custom' && (
                            <div style={{ marginTop: '12px' }}>
                                <ConfigProvider locale={{...zhCN, DatePicker: {...zhCN.DatePicker, lang: {...zhCN.DatePicker?.lang, ok: '确认'}} as any}}>
                                <DatePicker
                                    value={expirationDate}
                                    onChange={(date) => setExpirationDate(date)}
                                    showTime={{format: 'HH:mm:ss'}}
                                    format="YYYY-MM-DD HH:mm:ss"
                                    placeholder="选择过期日期和时间"
                                    style={{width: '100%'}}
                                    disabledDate={(current) => current && current.isBefore(new Date(), 'day')}
                                />
                                </ConfigProvider>
                        </div>
                        )}
                    </div>

                    {/* 生成按钮 / 结果区 */}
                    {!shareLink ? (
                        <Button
                            type="primary"
                            block
                            size="large"
                            loading={shareLoading}
                            onClick={handleShare}
                            disabled={expirationMode === 'custom' && !expirationDate}
                            style={{ borderRadius: '8px', height: '44px' }}
                        >
                            生成分享链接
                        </Button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{
                                background: '#f7f8fa',
                                borderRadius: '10px',
                                padding: '14px 16px',
                            }}>
                                <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '8px' }}>分享链接</div>
                                <Input.TextArea
                                    value={shareLink}
                                    readOnly
                                    rows={2}
                                    style={{ background: 'transparent', border: 'none', padding: 0, resize: 'none', boxShadow: 'none' }}
                                />
                            </div>
                            {sharePassword && (
                                <div style={{
                                    background: '#F7F8FA',
                                    borderRadius: '10px',
                                    padding: '14px 16px',
                                }}>
                                    <div style={{ fontSize: '12px', color: '#8c8c8c', marginBottom: '6px' }}>访问密码</div>
                                    <div style={{ fontWeight: 700, fontSize: '22px', letterSpacing: '6px', color: '#666' }}>{sharePassword}</div>
                                </div>
                            )}
                            <Button
                                type="primary"
                                block
                                size="large"
                                onClick={handleCopyLink}
                                style={{borderRadius: '8px', height: '44px' }}
                            >
                                {sharePassword ? '复制链接和密码' : '复制链接'}
                            </Button>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
})

export default ProjectList;
