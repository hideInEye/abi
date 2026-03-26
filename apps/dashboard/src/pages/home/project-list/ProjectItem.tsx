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

import './ProjectItem.less';
import {Copy, Delete, Edit, PreviewOpen, Share} from "@icon-park/react";
import {Input, Popover, Modal, Switch, message} from "antd";
import {useState} from "react";
import {IProjectInfo, SaveType} from "../../../designer/DesignerType.ts";
import baseApi from "../../../api/BaseApi.ts";

export interface ProjectItemProps {
    id: string;
    name: string;
    cover?: string;
    saveType: SaveType;
    doOperate: (id: string, type: string) => void;
    spaceId?: string;
}

export default function ProjectItem(props: ProjectItemProps) {
    const {cover, id, doOperate, spaceId} = props;
    const [rename, setRename] = useState(false);
    const [name, setName] = useState(props.name);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [sharePasswordFlag, setSharePasswordFlag] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [sharePassword, setSharePassword] = useState<string | null>('');
    const [shareLoading, setShareLoading] = useState(false);

    const updateName = () => {
        if (name !== props.name) {
            const data: IProjectInfo = {id, name};
            baseApi.updateProject(data);
        }
    }

    const handleShare = async () => {
        setShareLoading(true);
        try {
            const currentSpaceId = localStorage.getItem('spaceId') || '';
            const res = await baseApi.shareProject(Number(id), Number(currentSpaceId), sharePasswordFlag);
            if (res?.shareUrl) {
                // 将 /#/dr/xxx 格式转为 /dr/xxx，兼容 history 路由
                const shareUrl = res.shareUrl.replace('/#/', '/');
                setShareLink(shareUrl);
                setSharePassword(res.sharePassword ?? null);
            }
        } finally {
            setShareLoading(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareLink).then(() => {
            message.success('分享链接已复制到剪贴板');
        });
    };

    const handleCloseShareModal = () => {
        setShareModalVisible(false);
        setShareLink('');
        setSharePassword(null);
        setSharePasswordFlag(false);
    };

    return (
        <div className="project-list-item">
            <div className="project-item-cover" style={{backgroundImage: `url(${cover})`}}>
                <div className="operate-icon-list">
                    <div className="operate-icon"><Popover content={'编辑项目'}><Edit
                        onClick={() => doOperate(id, "edit")}/></Popover></div>
                    <div className="operate-icon"><Popover content={'预览项目'}><PreviewOpen
                        onClick={() => doOperate(id, "show")}/></Popover></div>
                    <div className="operate-icon"><Popover content={'删除项目'}><Delete
                        onClick={() => doOperate(id, "del")}/></Popover></div>
                    <div className="operate-icon"><Popover content={'复制项目'}><Copy
                        onClick={() => doOperate(id, "clone")}/></Popover></div>
                    <div className="operate-icon"><Popover content={'分享项目'}><Share
                        onClick={() => setShareModalVisible(true)}/></Popover></div>
                </div>
            </div>
            <div className="project-item-content">
                <div className="project-name">
                    {rename ?
                        <div className="project-rename-input">
                            <Input autoFocus={true}
                                   size={"small"}
                                   value={name}
                                   onBlur={() => {
                                       updateName();
                                       setRename(false);
                                   }}
                                   onKeyDown={(event) => {
                                       if (event.key === 'Enter') {
                                           updateName();
                                           setRename(false);
                                       }
                                   }}
                                   onChange={(e) => setName(e.target.value)}/>
                        </div> :
                        <div className="project-name-content">{name}</div>
                    }
                </div>
                <div className="rename-icon" onClick={() => setRename(true)}>
                    {rename || <Popover content={'重命名'}><Edit/></Popover>}
                </div>
            </div>
            <Modal
                title="分享大屏项目"
                open={shareModalVisible}
                onCancel={handleCloseShareModal}
                footer={null}
                width={500}
            >
                <div style={{ padding: '20px 0' }}>
                    <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>设置访问密码：</span>
                        <Switch
                            checked={sharePasswordFlag}
                            onChange={setSharePasswordFlag}
                        />
                    </div>
                    {!shareLink ? (
                        <div style={{ textAlign: 'center' }}>
                            <button
                                onClick={handleShare}
                                disabled={shareLoading}
                                style={{
                                    padding: '8px 24px',
                                    backgroundColor: '#1890ff',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: shareLoading ? 'not-allowed' : 'pointer',
                                    opacity: shareLoading ? 0.6 : 1
                                }}
                            >
                                {shareLoading ? '生成中...' : '生成分享链接'}
                            </button>
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '15px' }}>
                                <div style={{ marginBottom: '8px', color: '#666' }}>分享链接：</div>
                                <Input.TextArea
                                    value={shareLink}
                                    readOnly
                                    rows={3}
                                    style={{ backgroundColor: '#f5f5f5' }}
                                />
                            </div>
                            {sharePassword && (
                                <div style={{marginBottom: '15px'}}>
                                    <div style={{marginBottom: '8px', color: '#666'}}>访问密码：</div>
                                    <Input
                                        value={sharePassword}
                                        readOnly
                                        style={{backgroundColor: '#f5f5f5'}}
                                    />
                                </div>
                            )}
                            <div style={{textAlign: 'center'}}>
                                <button
                                    onClick={handleCopyLink}
                                    style={{
                                        padding: '8px 24px',
                                        backgroundColor: '#52c41a',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    复制链接
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    )
}