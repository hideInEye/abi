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
import {AfferentFour, ConnectionPointTwo, EfferentFour, Eyes, HardDiskOne, PageTemplate, Theme} from "@icon-park/react";
import URLUtil from "../../utils/URLUtil.ts";
import {DesignerMode} from "../DesignerType.ts";
import AiChatPanel from "./items/ai-chat/AiChatPanel.tsx";


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
        const [aiChatVisible, setAiChatVisible] = React.useState(false);
        const publishStatus = String(projectHdStore.projectConfig.state ?? '0');

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
                        <div className={'header-item'} onClick={() => {/* 接口待开发 */}}>
                            <span className={'item-span'} style={{fontSize: 13}}>
                                {publishStatus === '1' ? '已发布' : '发布'}
                            </span>
                        </div>
                        {buildHeaderItemUI(leftItems)}
                        <div
                            className={`header-item${aiChatVisible ? ' header-item-active' : ''}`}
                            onClick={() => setAiChatVisible(!aiChatVisible)}
                            title="AI 智能问答"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{marginBottom: 2}}>
                                <path d="M20 2H4a2 2 0 00-2 2v12a2 2 0 002 2h4l4 4 4-4h4a2 2 0 002-2V4a2 2 0 00-2-2zm-9 11H7v-2h4v2zm6 0h-4v-2h4v2zm0-4H7V7h10v2z"/>
                            </svg>
                            <span className={'item-span'}>AI问答</span>
                        </div>
                    </div>
                    {canvasHdStore.canvasVisible && <CanvasHdConfigImpl/>}
                    {projectHdStore.projectVisible && <ProjectHdItemImpl/>}
                    {themeHdStore.themeVisible && <ThemeHdItemImpl/>}
                    {bluePrintHdStore.bluePrintVisible && <BluePrintHdImpl/>}
                    {aiChatVisible && (
                        <AiChatPanel
                            onClose={() => setAiChatVisible(false)}
                            taskType="development"
                        />
                    )}
                </div>
            </>
        );
    }
);

export default Header;
