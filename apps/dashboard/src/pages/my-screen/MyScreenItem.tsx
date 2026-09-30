import {Button, ConfigProvider, DatePicker, Input, Modal, Popover, Segmented, Switch, message} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type {Dayjs} from 'dayjs';
import {useState} from 'react';
import {PreviewOpen, Share, Undo} from '@icon-park/react';
import {IProjectInfo, SaveType} from '../../designer/DesignerType.ts';
import baseApi from '../../api/BaseApi.ts';
import URLUtil from '../../utils/URLUtil.ts';
import {normalizeShareUrl} from '../../utils/ShareViewUtil.ts';
import defaultSnapshot from '../home/image/default-snapshot.jpg';
import '../home/project-list/ProjectItem.less';

interface MyScreenItemProps {
    item: IProjectInfo;
    onUnpublish: (id: string) => void;
}

export default function MyScreenItem({item, onUnpublish}: MyScreenItemProps) {
    const {id, name, cover} = item;
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [sharePasswordFlag, setSharePasswordFlag] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [sharePassword, setSharePassword] = useState<string | null>('');
    const [shareLoading, setShareLoading] = useState(false);
    const [expirationMode, setExpirationMode] = useState<string>('forever');
    const [expirationDate, setExpirationDate] = useState<Dayjs | null>(null);

    const handlePreview = () => {
        window.open(URLUtil.buildAppUrl('/view', {id: id!, saveType: SaveType.SERVER, mode: 'view'}), '_blank');
    };

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
            <div className="project-item-cover"
                 style={{backgroundImage: `url(${cover || defaultSnapshot})`, aspectRatio: 'unset', height: '105px'}}>
                <div className="operate-icon-list">
                    <div className="operate-icon">
                        <Popover content="查看项目">
                            <PreviewOpen onClick={handlePreview}/>
                        </Popover>
                    </div>
                    <div className="operate-icon">
                        <Popover content="取消发布">
                            <Undo onClick={() => onUnpublish(id!)}/>
                        </Popover>
                    </div>
                    <div className="operate-icon">
                        <Popover content="分享项目">
                            <Share onClick={() => setShareModalVisible(true)}/>
                        </Popover>
                    </div>
                </div>
            </div>
            <div className="project-item-content">
                <div className="project-name">
                    <div className="project-name-content">{name}</div>
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
    );
}
