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

import React, {ReactElement, ReactNode} from 'react';
import './DesignerHeader.less';
import {observer} from "mobx-react";
import eventOperateStore from "../operate-provider/EventOperateStore";
import {doSave, exportProject, importProject} from "../operate-provider/hot-key/HotKeyImpl";
import canvasHdStore from "./items/canvas/CanvasManager.ts";
import projectHdStore from "./items/project/ProjectManager.ts";
import themeHdStore from "./items/theme/ThemeManager.ts";
import bluePrintHdStore from "./items/blue-print/BluePrintHdStore.ts";
import CanvasHdConfigImpl from "./items/canvas/CanvasHdConfigImpl.tsx";
import ProjectHdItemImpl from "./items/project/ProjectHdItemImpl.tsx";
import ThemeHdItemImpl from "./items/theme/ThemeHdItemImpl.tsx";
import BluePrintHdImpl from "./items/blue-print/BluePrintHdImpl.tsx";
import {AfferentFour, ConnectionPointTwo, EfferentFour, Eyes, HardDiskOne, PageTemplate, Theme, Send} from "@icon-park/react";
import URLUtil from "../../utils/URLUtil.ts";
import {DesignerMode, ProjectState} from "../DesignerType.ts";
import baseApi from "../../api/BaseApi.ts";
import {globalMessage} from "../../framework/message/GlobalMessage.tsx";
import designerManager from "../manager/DesignerManager.ts";


export interface IHeaderItem {
    icon: ReactNode;
    name: string;
    key: string;
    onClick?: () => void;
}

const centerItems: Array<IHeaderItem> = [
    {
        icon: <ConnectionPointTwo theme="filled" style={{marginTop: 2}} strokeWidth={4} strokeLinecap="square"/>,
        name: '蓝图',
        key: 'blue-print',
        onClick: () => {
            //打开蓝图前清空画布中已经选中的组件,避免删除蓝图节点时，误删画布中的组件
            const {setTargetIds} = eventOperateStore;
            setTargetIds([]);
            bluePrintHdStore.setBluePrintVisible(true);
        }
    },
    {
        icon: <PageTemplate theme="filled" style={{marginTop: 2}} strokeWidth={3} strokeLinecap="square"/>,
        name: '画布',
        key: 'canvas',
        onClick: () => canvasHdStore.setCanvasVisible(true)
    },
    {
        icon: <Theme theme="filled" style={{marginTop: 2}} strokeWidth={4} strokeLinecap="square"/>,
        name: '主题',
        key: 'theme',
        onClick: () => themeHdStore.setThemeVisible(true)
    }
];

const leftItems: Array<IHeaderItem> = [
    {
        icon: <AfferentFour theme="filled" style={{marginTop: 2}} strokeLinecap="square"/>,
        name: '导入',
        key: 'import',
        onClick: () => importProject()
    },
    {
        icon: <EfferentFour theme="filled" style={{marginTop: 2}} strokeLinecap="square"/>,
        name: '导出',
        key: 'export',
        onClick: () => exportProject()
    },
    {
        icon: <HardDiskOne theme="filled" style={{marginTop: 2}} strokeLinecap="square"/>,
        name: '保存',
        key: 'save',
        onClick: () => doSave()
    },
    {
        icon: <Eyes theme="outline" style={{marginTop: 2}} strokeWidth={4} strokeLinecap="square"/>,
        name: '预览',
        key: 'preview',
        onClick: () => {
            const {saveType, id} = URLUtil.parseUrlParams();
            window.open(URLUtil.buildAppUrl('/view', {id, saveType, mode: DesignerMode.VIEW}), '_blank');
        }
    }
];


const Header: React.FC = observer(() => {
        const publishStatus = String(projectHdStore.projectConfig.status ?? '1');

        const handlePublish = async () => {
            if (publishStatus === '0') return;
            const {id} = URLUtil.parseUrlParams();
            const proData = designerManager.getData();
            // 保留 dataJson 中已有的会话标识（chatId / convUid），防止发布时覆盖丢失
            const sessionPatch: {chatId?: string; convUid?: string} = {};
            try {
                const existing = projectHdStore.projectConfig.dataJson;
                if (existing) {
                    const parsed = JSON.parse(existing);
                    if (parsed?.chatId) sessionPatch.chatId = parsed.chatId;
                    if (parsed?.convUid) sessionPatch.convUid = parsed.convUid;
                }
            } catch { /* ignore */ }
            await baseApi.updateProject({
                id,
                dataJson: JSON.stringify({...proData, ...sessionPatch}),
                status: '0',
            });
            projectHdStore.updateProjectConfig({status: '0'});
            globalMessage.messageApi?.success('发布成功');
        };

        const handleBack = () => {
            const historyIndex = window.history.state?.idx;
            if (typeof historyIndex === 'number' && historyIndex > 0) {
                window.history.back();
                return;
            }
            const fallbackPath = window.__ABI_DASHBOARD_HOST_BASE_PATH__
                ? '/workbench/screen-manage/abi-dashboard'
                : '/projects';
            URLUtil.navigateToAppPath(fallbackPath);
        };

        const buildHeaderItemUI = (items: Array<IHeaderItem>): Array<ReactElement> => {
            const headerItems: Array<ReactElement> = [];
            for (let i = 0; i < items.length; i++) {
                const {icon: Icon, name, key, onClick} = items[i];
                headerItems.push(
                    <div key={key} className={'header-item'} onClick={onClick}>
                        {Icon}
                        <span className={'item-span'}>{name}</span>
                    </div>
                );
            }
            return headerItems;
        }

        return (
            <>
                <div className={'designer-header'}>
                    <div className={'header-left'}>
                        <button className={'header-back-button'} onClick={handleBack} type={'button'}>
                            <span className={'back-icon'}>{'<'}</span>
                            <span>返回</span>
                        </button>
                    </div>
                    <div className={'header-center'}>
                        {buildHeaderItemUI(centerItems)}
                    </div>
                    <div className={'header-right'}>
                        <div className={'header-item'} onClick={handlePublish}
                             style={publishStatus === '0' ? {cursor: 'default', opacity: 0.6} : {}}>
                            <Send theme="outline" style={{marginTop: 2}} strokeWidth={4} strokeLinecap="square"/>
                            <span className={'item-span'}>
                                {publishStatus === '0' ? '当前启用' : '发布'}
                            </span>
                        </div>
                        {buildHeaderItemUI(leftItems)}
                    </div>
                    {canvasHdStore.canvasVisible && <CanvasHdConfigImpl/>}
                    {projectHdStore.projectVisible && <ProjectHdItemImpl/>}
                    {themeHdStore.themeVisible && <ThemeHdItemImpl/>}
                    {bluePrintHdStore.bluePrintVisible && <BluePrintHdImpl/>}
                </div>
            </>
        );
    }
);

export default Header;
