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
import {Input, Popover, Modal, Switch, message, Segmented, DatePicker, Button, ConfigProvider} from "antd";
import zhCN from 'antd/locale/zh_CN';
import type {Dayjs} from 'dayjs';
import {useState} from "react";
import {IProjectInfo, SaveType} from "../../../designer/DesignerType.ts";
import baseApi from "../../../api/BaseApi.ts";
import {normalizeShareUrl} from "../../../utils/ShareViewUtil.ts";

export interface ProjectItemProps {
    id: string;
    name: string;
    cover?: string;
    saveType: SaveType;
    doOperate: (id: string, type: string) => void;
    spaceId?: string;
    status?: string;
}

export default function ProjectItem(props: ProjectItemProps) {
    const {cover, id, doOperate, spaceId, status} = props;
    const [rename, setRename] = useState(false);
    const [name, setName] = useState(props.name);
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [sharePasswordFlag, setSharePasswordFlag] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [sharePassword, setSharePassword] = useState<string | null>('');
    const [shareLoading, setShareLoading] = useState(false);
    const [expirationMode, setExpirationMode] = useState<string>('forever');
    const [expirationDate, setExpirationDate] = useState<Dayjs | null>(null);

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
            const expirationDays = ['1', '7', '30'].includes(expirationMode) ? Number(expirationMode) : undefined;
            const expirationDateStr = expirationMode === 'custom' && expirationDate
                ? expirationDate.format('YYYY-MM-DD HH:mm:ss')
                : undefined;
            const res = await baseApi.shareProject(Number(id), Number(currentSpaceId), sharePasswordFlag, expirationDays, expirationDateStr);
            if (res?.shareUrl) {
                // 将 /#/dr/xxx 格式转为 /share_url/xxx（助手与大屏共用新路径），兼容 history 路由；旧 dashboard_share_page 路径过渡期直接替换
                const shareUrl = normalizeShareUrl(res.shareUrl.replace('/#/', '/').replace('/dr/', '/share_url/'));
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

    return (
        <div className="project-list-item">
            <div className="project-item-cover" style={{backgroundImage: `url(${cover})`}}>
                <div className="operate-icon-list">
                    <div className="operate-icon"><Popover content={'编辑项目'}><Edit
                        onClick={() => doOperate(id, "edit")}/></Popover></div>
                    <div className="operate-icon"><Popover content={'预览项目'}><PreviewOpen
                        onClick={() => doOperate(id, "show")}/></Popover></div>
                    {status !== '0' && (
                        <div className="operate-icon"><Popover content={'删除项目'}><Delete
                            onClick={() => doOperate(id, "del")}/></Popover></div>
                    )}
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
    )
}