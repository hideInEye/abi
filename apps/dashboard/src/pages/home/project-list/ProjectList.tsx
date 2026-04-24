/*
 * Copyright © 2023-2025 puyinzhen
 * All rights reserved.
 *
 * The copyright of this work (or idea/project/document) is owned by puyinzhen. Without explicit written permission, no part of this work may be reproduced, distributed, or modified in any form for commercial purposes.
 *
 * This copyright statement applies to, but is not limited to: concept descriptions, design documents, source code, images, presentation files, and any related content.
 *
 * For permission to use this work or any part of it, please contact 1182810784@qq.com to obtain written authorization.
 */

import React, {memo, useEffect, useRef} from 'react';
import './ProjectList.less';
import {Button, Empty, Input, Pagination} from "antd";
import defaultSnapshot from '../image/default-snapshot.jpg';
import {DesignerMode, IPage, IProjectInfo, SaveType} from "../../../designer/DesignerType";
import {INewProjectInfo, NewProjectDialog} from "./NewProjectDialog.tsx";
import {globalMessage} from "../../../framework/message/GlobalMessage";
import DelProjectDialog from "./DelProjectDialog.tsx";
import CloneProjectDialog from "./CloneProjectDialog.tsx";
import ProjectItem from "./ProjectItem.tsx";
import baseApi from "../../../api/BaseApi.ts";
import URLUtil from "../../../utils/URLUtil.ts";

const {Search} = Input;

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
        });
    }

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key !== 'Enter')
            return;
        doSearch((event.target as any).value);
    }

    const doSearch = (value: string) => {
        const spaceId = Number(localStorage.getItem('spaceId')) || undefined;
        baseApi.getProjectInfoPageList({
            current: pageData.current,
            size: pageData.size,
            keywords: value,
            spaceId,
        }).then((data: IPage<IProjectInfo>) => {
            if (statusFilter !== undefined) {
                data.records = data.records.filter((item: IProjectInfo) => String(item.status) === statusFilter);
            }
            setPageData(data);
        });
    }

    useEffect(() => {
        getProjectPageList(pageData.current, pageData.size);
    }, []);

    return (
        <div className={'project-list-container'}>
            <h1 className={'project-list-title'}>{title}</h1>
            <div className={'project-list-header'}>
                <Search placeholder="搜索项目"
                        className={'project-list-search'}
                        onKeyDown={onKeyDown}
                        onSearch={doSearch}
                        style={{width: '12.5rem'}}/>
                {!statusFilter && <Button type={"primary"} onClick={toggleNewProVisible} style={{marginLeft: 'auto'}}>新增</Button>}
            </div>
            <div className={'project-list'}>
                {pageData && pageData.records.length > 0 ? pageData.records.map((item: IProjectInfo) => {
                    return (
                        <ProjectItem key={item.id} id={item.id!} name={item.name!} cover={item.cover || defaultSnapshot}
                                     saveType={saveType}
                                     status={item.status}
                                     spaceId={String(item.spaceId)}
                                     doOperate={operateHandler}/>
                    )
                }) : (
                    <div style={{
                        width: '100%',
                        flex: '0 0 100%',
                        maxWidth: '100%',
                        aspectRatio: 'unset',
                        border: '1px solid #e8e8e8',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '200px',
                        overflow: 'hidden',
                    }}>
                        <Empty description="暂无数据"/>
                    </div>
                )}
            </div>
            {pageData && pageData.records.length > 0 && (
                <Pagination rootClassName={'project-list-page'} current={pageData?.current}
                            pageSize={pageData?.size} total={pageData?.total} onChange={pageChange}
                            showSizeChanger onShowSizeChange={pageChange}
                            locale={{ items_per_page: '条/页' }}/>
            )}
            <NewProjectDialog onOk={onOk} onCancel={onCancel} visible={addDialog}/>
            <DelProjectDialog visible={delDialog} onOk={confirmDel} onCancel={cancelDel}/>
            <CloneProjectDialog onOk={() => confirmClone()} onCancel={cancelClone}
                                visible={cloneDialog}/>
        </div>
    );
})

export default ProjectList;


