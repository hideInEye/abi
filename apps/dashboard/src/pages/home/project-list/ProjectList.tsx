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

import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import type {Dayjs} from 'dayjs';

import {DesignerMode} from '../../../designer/DesignerType';
import type {IPage, IProjectInfo, SaveType} from '../../../designer/DesignerType';
import {LazyFeatureFallback, RetryableLazy} from '../../../runtime/RetryableLazy';
import URLUtil from '../../../utils/URLUtil';
import type {INewProjectInfo} from './NewProjectDialog';
import './ProjectList.less';
import {
    getProjectListRequestKey,
    projectListRequestClient,
    readDashboardSpaceId,
    type ProjectListQuery,
} from './projectListResource';

const loadNewProjectDialog = () => import('./NewProjectDialog');
const loadDelProjectDialog = () => import('./DelProjectDialog');
const loadCloneProjectDialog = () => import('./CloneProjectDialog');
const loadProjectListView = () => import('./ProjectListView');
const loadProjectRenameDialog = () => import('./ProjectRenameDialog');
const loadBaseApi = () => import('../../../api/BaseApi').then(module => module.default);

type MessageKind = 'error' | 'success' | 'warning';

async function showGlobalMessage(kind: MessageKind, content: string) {
    const {globalMessage} = await import('../../../framework/message/GlobalMessage');
    globalMessage.messageApi?.[kind](content);
}

export interface ProjectListProps {
    saveType: SaveType;
    statusFilter?: string;
    title?: string;
}

export const ProjectList = memo((props: ProjectListProps) => {
    const {saveType, statusFilter} = props;
    const [addDialog, setAddDialog] = useState(false);
    const [cloneDialog, setCloneDialog] = useState(false);
    const [delDialog, setDelDialog] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [listError, setListError] = useState('');
    const [listLoading, setListLoading] = useState(false);
    const [pageData, setPageData] = useState<IPage<IProjectInfo>>({records: [], total: 0, current: 1, size: 12});
    const [pageSize, setPageSize] = useState(12);
    const [renameId, setRenameId] = useState('');
    const [renameLoading, setRenameLoading] = useState(false);
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renameValue, setRenameValue] = useState('');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [uiReady, setUiReady] = useState(false);
    const activeListRequestRef = useRef<{key: string; run: number} | null>(null);
    const cloneIdRef = useRef('');
    const delIdRef = useRef('');
    const listRequestRunRef = useRef(0);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        const timer = window.setTimeout(() => setUiReady(true), 0);
        return () => window.clearTimeout(timer);
    }, []);

    const loadProjectPage = useCallback(async (query: ProjectListQuery, force = false) => {
        const key = getProjectListRequestKey(query);
        const previous = activeListRequestRef.current;
        if (previous && previous.key !== key) projectListRequestClient.abort(previous.key);

        const run = ++listRequestRunRef.current;
        activeListRequestRef.current = {key, run};
        setListLoading(true);
        setListError('');
        try {
            const data = await projectListRequestClient.load(query, {force});
            if (activeListRequestRef.current?.run !== run) return false;
            setPageData({...data, current: query.current, size: query.size});
            setCurrentPage(query.current);
            setPageSize(query.size);
            setSelectedRowKeys([]);
            return true;
        } catch (error: any) {
            if (error?.name !== 'AbortError' && activeListRequestRef.current?.run === run) {
                setListError(error?.message || '项目列表加载失败，请重试');
            }
            return false;
        } finally {
            if (activeListRequestRef.current?.run === run) setListLoading(false);
        }
    }, []);

    const getProjectPageList = useCallback((
        current: number,
        size: number,
        keywords = '',
        range: [Dayjs | null, Dayjs | null] | null = null,
        force = false,
    ) => loadProjectPage({
        current,
        endTime: range?.[1]?.endOf('day').format('YYYY-MM-DD HH:mm:ss'),
        keywords,
        size,
        spaceId: readDashboardSpaceId(),
        startTime: range?.[0]?.startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        statusFilter,
    }, force), [loadProjectPage, statusFilter]);

    const invalidateAndReloadCurrentPage = () => {
        projectListRequestClient.invalidateForSpace(readDashboardSpaceId());
        return getProjectPageList(currentPage, pageSize, searchKeyword, dateRange, true);
    };

    const toggleNewProVisible = () => {
        void loadNewProjectDialog();
        setAddDialog(visible => !visible);
    };

    const onOk = async (data: INewProjectInfo) => {
        const {name, des, width, height} = data;
        const spaceId = Number(localStorage.getItem('spaceId'));
        try {
            const baseApi = await loadBaseApi();
            const project: IProjectInfo = {
                name,
                des,
                dataJson: JSON.stringify({canvasManager: {width, height}}),
                spaceId,
            };
            const id = await baseApi.createProject(project);
            if (id === '') return;

            // A screen remains usable when chat-session provisioning fails; the chat panel can repair it on demand.
            try {
                let userId = 0;
                try {
                    const info = localStorage.getItem('SOY-REACT_userInfo');
                    if (info) {
                        const storedUserId = JSON.parse(info)?.userId;
                        userId = storedUserId != null ? Number(storedUserId) : 0;
                    }
                } catch {
                    // Malformed legacy user data must not block screen creation.
                }
                const session = await baseApi.addChatSession({spaceId, userId, title: name});
                if (session) {
                    await baseApi.updateProject({
                        id,
                        dataJson: JSON.stringify({
                            canvasManager: {width, height},
                            chatId: session.sessionId,
                            convUid: session.convUid,
                        }),
                    });
                }
            } catch (sessionError) {
                console.warn('大屏会话创建失败，将在对话面板按需补建:', sessionError);
            }

            projectListRequestClient.invalidateForSpace(readDashboardSpaceId());
            setAddDialog(false);
            URLUtil.navigateToAppPath('/designer', {id, saveType, mode: DesignerMode.EDIT});
        } catch (error) {
            console.error('创建项目失败:', error);
            void showGlobalMessage('error', '创建失败');
        }
    };

    const operateHandler = (id: string, type: string) => {
        switch (type) {
            case 'edit':
                URLUtil.navigateToAppPath('/designer', {id, saveType, mode: DesignerMode.EDIT});
                break;
            case 'show':
                window.open(URLUtil.buildAppUrl('/view', {id, saveType, mode: DesignerMode.VIEW}), '_blank');
                break;
            case 'del':
                void loadDelProjectDialog();
                delIdRef.current = id;
                setDelDialog(true);
                break;
            case 'clone':
                void loadCloneProjectDialog();
                cloneIdRef.current = id;
                setCloneDialog(true);
                break;
        }
    };

    const confirmClone = async () => {
        try {
            const baseApi = await loadBaseApi();
            const id = await baseApi.copyProject(cloneIdRef.current);
            if (id !== '') {
                setCloneDialog(false);
                void showGlobalMessage('success', '克隆成功');
                await invalidateAndReloadCurrentPage();
            } else {
                void showGlobalMessage('error', '克隆失败');
            }
        } catch (error) {
            console.error('克隆失败:', error);
            void showGlobalMessage('error', '克隆失败');
        }
    };

    const confirmDel = async () => {
        const id = delIdRef.current;
        try {
            const baseApi = await loadBaseApi();
            const deleted = await baseApi.deleteProject(id);
            if (deleted) {
                setDelDialog(false);
                void showGlobalMessage('success', '删除成功');
                void baseApi.syncShareAppStatus(id, 0);
                await invalidateAndReloadCurrentPage();
            } else {
                void showGlobalMessage('error', '删除失败');
            }
        } catch (error) {
            console.error('删除失败:', error);
            void showGlobalMessage('error', '删除失败');
        }
    };

    const handleBatchDelete = async () => {
        if (selectedRowKeys.length === 0) {
            void showGlobalMessage('warning', '请先选择要删除的项目');
            return;
        }
        try {
            const baseApi = await loadBaseApi();
            for (const id of selectedRowKeys) {
                const deleted = await baseApi.deleteProject(String(id));
                if (!deleted) throw new Error(`项目 ${String(id)} 删除失败`);
                void baseApi.syncShareAppStatus(id as number | string, 0);
            }
            void showGlobalMessage('success', `成功删除 ${selectedRowKeys.length} 个项目`);
            setSelectedRowKeys([]);
            await invalidateAndReloadCurrentPage();
        } catch (error) {
            console.error('批量删除失败:', error);
            void showGlobalMessage('error', '批量删除失败');
        }
    };

    const pageChange = (page: number, size: number) => {
        void getProjectPageList(page, size, searchKeyword, dateRange);
    };

    const runQuery = (overrides?: {keyword?: string; range?: [Dayjs | null, Dayjs | null] | null}) => {
        const keywords = overrides?.keyword ?? searchKeyword;
        const range = overrides?.range === undefined ? dateRange : overrides.range;
        void getProjectPageList(1, pageSize, keywords, range);
    };

    const handleSearchChange = (value: string) => {
        setSearchKeyword(value);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        searchTimerRef.current = setTimeout(() => runQuery({keyword: value}), value === '' ? 0 : 1000);
    };

    const handleReset = () => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        setSearchKeyword('');
        setDateRange(null);
        runQuery({keyword: '', range: null});
    };

    const openRename = (id: string, currentName: string) => {
        void loadProjectRenameDialog();
        setRenameId(id);
        setRenameValue(currentName);
        setRenameModalVisible(true);
    };

    const handleRenameConfirm = async () => {
        const nextName = renameValue.trim();
        if (!nextName) {
            void showGlobalMessage('warning', '请输入项目名称');
            return;
        }
        setRenameLoading(true);
        try {
            const baseApi = await loadBaseApi();
            const updated = await baseApi.updateProject({id: renameId, name: nextName});
            if (updated) {
                setRenameModalVisible(false);
                void showGlobalMessage('success', '重命名成功');
                await invalidateAndReloadCurrentPage();
            }
        } finally {
            setRenameLoading(false);
        }
    };

    useEffect(() => {
        void getProjectPageList(1, 12, '', null);
        return () => {
            if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
            const active = activeListRequestRef.current;
            if (active) projectListRequestClient.abort(active.key);
        };
    }, [getProjectPageList]);

    useEffect(() => {
        const handleSpaceChange = () => {
            setSearchKeyword('');
            setDateRange(null);
            setCurrentPage(1);
            void getProjectPageList(1, pageSize, '', null);
        };
        window.addEventListener('abi-dashboard:space-change', handleSpaceChange);
        return () => window.removeEventListener('abi-dashboard:space-change', handleSpaceChange);
    }, [getProjectPageList, pageSize]);

    if (!uiReady) {
        return <LazyFeatureFallback label="正在准备项目列表…" style={{height: '100%', minHeight: 320, width: '100%'}}/>;
    }

    return (
        <>
            <RetryableLazy
                loader={loadProjectListView}
                componentProps={{
                    currentPage,
                    dateRange,
                    listError,
                    listLoading,
                    onApplyFilters: () => runQuery(),
                    onBatchDelete: handleBatchDelete,
                    onDateRangeChange: setDateRange,
                    onNewProject: toggleNewProVisible,
                    onOperate: operateHandler,
                    onPageChange: pageChange,
                    onPreloadNewProject: () => void loadNewProjectDialog(),
                    onRename: openRename,
                    onReset: handleReset,
                    onRetry: () => void getProjectPageList(currentPage, pageSize, searchKeyword, dateRange, true),
                    onSearchChange: handleSearchChange,
                    onSearchSubmit: () => runQuery(),
                    onSelectionChange: setSelectedRowKeys,
                    pageSize,
                    records: pageData.records,
                    searchKeyword,
                    selectedRowKeys,
                    statusFilter,
                    totalCount: pageData.total || 0,
                }}
                fallback={<LazyFeatureFallback label="正在准备项目列表…" style={{height: '100%', minHeight: 320, width: '100%'}}/>}
            />

            {addDialog ? (
                <RetryableLazy
                    loader={loadNewProjectDialog}
                    componentProps={{onOk, onCancel: () => setAddDialog(false), visible: addDialog}}
                    fallback={<LazyFeatureFallback label="正在加载新建大屏…" style={{position: 'fixed', inset: 0, zIndex: 1000, minHeight: '100vh'}}/>}
                />
            ) : null}
            {delDialog ? (
                <RetryableLazy
                    loader={loadDelProjectDialog}
                    componentProps={{visible: delDialog, onOk: confirmDel, onCancel: () => setDelDialog(false)}}
                    fallback={<LazyFeatureFallback label="正在加载删除确认…" style={{position: 'fixed', inset: 0, zIndex: 1000, minHeight: '100vh'}}/>}
                />
            ) : null}
            {cloneDialog ? (
                <RetryableLazy
                    loader={loadCloneProjectDialog}
                    componentProps={{onOk: confirmClone, onCancel: () => setCloneDialog(false), visible: cloneDialog}}
                    fallback={<LazyFeatureFallback label="正在加载克隆确认…" style={{position: 'fixed', inset: 0, zIndex: 1000, minHeight: '100vh'}}/>}
                />
            ) : null}
            {renameModalVisible ? (
                <RetryableLazy
                    loader={loadProjectRenameDialog}
                    componentProps={{
                        loading: renameLoading,
                        onCancel: () => setRenameModalVisible(false),
                        onChange: setRenameValue,
                        onConfirm: handleRenameConfirm,
                        open: renameModalVisible,
                        value: renameValue,
                    }}
                    fallback={<LazyFeatureFallback label="正在加载重命名窗口…" style={{position: 'fixed', inset: 0, zIndex: 1000, minHeight: '100vh'}}/>}
                />
            ) : null}
        </>
    );
});

export default ProjectList;
