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
// import {Add} from "@icon-park/react";
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
        baseApi.getProjectInfoPageList({
            current,
            size,
            keywords,
        }).then((data: IPage<IProjectInfo>) => {
            if (statusFilter !== undefined) {
                data.records = data.records.filter((item: IProjectInfo) => String(item.status) === statusFilter);
            }
            setPageData(data);
        });
    }


    const toggleNewProVisible = () => setAddDialog(!addDialog);

    const onOk = (data: INewProjectInfo) => {
        const {name, des, width, height} = data;
        const project: IProjectInfo = {
            name: name,
            des: des,
            dataJson: JSON.stringify({canvasManager: {width, height}}),
            spaceId: Number(localStorage.getItem('spaceId')),
        }
        baseApi.createProject(project).then((id) => {
            if (id === "")
                globalMessage.messageApi?.error('创建失败');
            else {
                setAddDialog(false);
                URLUtil.navigateToAppPath('/designer', {id, saveType, mode: DesignerMode.EDIT});
            }
        });
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

    const confirmDel = () => {
        baseApi.deleteProject(delIdRef.current).then((res) => {
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
        baseApi.getProjectInfoPageList({
            current: page,
            size: size,
        }).then((data: IPage<IProjectInfo>) => {
            if (statusFilter !== undefined) {
                data.records = data.records.filter((item: IProjectInfo) => String(item.status) === statusFilter);
            }
            setPageData(data);
        });
    }

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key !== 'Enter')
            return;
        doSearch((event.target as any).value);
    }

    const doSearch = (value: string) => {
        baseApi.getProjectInfoPageList({
            current: pageData.current,
            size: pageData.size,
            keywords: value,
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
                <Pagination rootClassName={'project-list-page'} defaultCurrent={pageData?.current}
                            pageSize={pageData?.size} total={pageData?.total} onChange={pageChange}/>
            )}
            <NewProjectDialog onOk={onOk} onCancel={onCancel} visible={addDialog}/>
            <DelProjectDialog visible={delDialog} onOk={confirmDel} onCancel={cancelDel}/>
            <CloneProjectDialog onOk={() => confirmClone()} onCancel={cancelClone}
                                visible={cloneDialog}/>
        </div>
    );
})

export default ProjectList;


