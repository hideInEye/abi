import {Button, ConfigProvider, DatePicker, Input, Modal, Segmented, Switch, message} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import type {Dayjs} from 'dayjs';
import {useState} from 'react';

import baseApi from '../../api/BaseApi.ts';
import {normalizeShareUrl} from '../../utils/ShareViewUtil.ts';

interface MyScreenShareDialogProps {
    onClose: () => void;
    open: boolean;
    projectId: string;
}

export default function MyScreenShareDialog({onClose, open, projectId}: MyScreenShareDialogProps) {
    const [sharePasswordFlag, setSharePasswordFlag] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [sharePassword, setSharePassword] = useState<string | null>('');
    const [shareLoading, setShareLoading] = useState(false);
    const [expirationMode, setExpirationMode] = useState('forever');
    const [expirationDate, setExpirationDate] = useState<Dayjs | null>(null);

    const handleShare = async () => {
        setShareLoading(true);
        try {
            const currentSpaceId = localStorage.getItem('spaceId') || '';
            const expirationDays = ['1', '7', '30'].includes(expirationMode) ? Number(expirationMode) : undefined;
            const expirationDateStr = expirationMode === 'custom' && expirationDate
                ? expirationDate.format('YYYY-MM-DD HH:mm:ss')
                : undefined;
            const response = await baseApi.shareProject(
                Number(projectId),
                Number(currentSpaceId),
                sharePasswordFlag,
                expirationDays,
                expirationDateStr,
            );
            if (response?.shareUrl) {
                // 将 /#/dr/xxx 格式转为 /share_url/xxx（助手与大屏共用新路径），兼容 history 路由；旧 dashboard_share_page 路径过渡期直接替换
                setShareLink(normalizeShareUrl(response.shareUrl.replace('/#/', '/').replace('/dr/', '/share_url/')));
                setSharePassword(response.sharePassword ?? null);
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

    return (
        <Modal title="分享大屏项目" open={open} onCancel={onClose} footer={null} width={520} centered>
            <div style={{padding: '8px 0 4px'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#f7f8fa', borderRadius: 10, marginBottom: 12}}>
                    <div>
                        <div style={{fontWeight: 500, color: '#262626', marginBottom: 2}}>访问密码保护</div>
                        <div style={{fontSize: 12, color: '#8c8c8c'}}>开启后将生成随机访问密码</div>
                    </div>
                    <Switch checked={sharePasswordFlag} onChange={setSharePasswordFlag} disabled={Boolean(shareLink)} />
                </div>

                <div style={{padding: '14px 16px', background: '#f7f8fa', borderRadius: 10, marginBottom: 20}}>
                    <div style={{fontWeight: 500, color: '#262626', marginBottom: 10}}>链接有效期</div>
                    <Segmented
                        value={expirationMode}
                        onChange={value => setExpirationMode(String(value))}
                        options={[
                            {label: '永久', value: 'forever'},
                            {label: '1 天', value: '1'},
                            {label: '7 天', value: '7'},
                            {label: '30 天', value: '30'},
                            {label: '自定义', value: 'custom'},
                        ]}
                        block
                    />
                    {expirationMode === 'custom' ? (
                        <div style={{marginTop: 12}}>
                            <ConfigProvider locale={{...zhCN, DatePicker: {...zhCN.DatePicker, lang: {...zhCN.DatePicker?.lang, ok: '确认'}} as any}}>
                                <DatePicker
                                    value={expirationDate}
                                    onChange={setExpirationDate}
                                    showTime={{format: 'HH:mm:ss'}}
                                    format="YYYY-MM-DD HH:mm:ss"
                                    placeholder="选择过期日期和时间"
                                    style={{width: '100%'}}
                                    disabledDate={current => Boolean(current && current.isBefore(new Date(), 'day'))}
                                />
                            </ConfigProvider>
                        </div>
                    ) : null}
                </div>

                {!shareLink ? (
                    <Button
                        type="primary"
                        block
                        size="large"
                        loading={shareLoading}
                        onClick={handleShare}
                        disabled={expirationMode === 'custom' && !expirationDate}
                        style={{borderRadius: 8, height: 44}}
                    >
                        生成分享链接
                    </Button>
                ) : (
                    <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
                        <div style={{background: '#f7f8fa', borderRadius: 10, padding: '14px 16px'}}>
                            <div style={{fontSize: 12, color: '#8c8c8c', marginBottom: 8}}>分享链接</div>
                            <Input.TextArea value={shareLink} readOnly rows={2} style={{background: 'transparent', border: 'none', padding: 0, resize: 'none', boxShadow: 'none'}} />
                        </div>
                        {sharePassword ? (
                            <div style={{background: '#f7f8fa', borderRadius: 10, padding: '14px 16px'}}>
                                <div style={{fontSize: 12, color: '#8c8c8c', marginBottom: 6}}>访问密码</div>
                                <div style={{fontWeight: 700, fontSize: 22, letterSpacing: 6, color: '#666'}}>{sharePassword}</div>
                            </div>
                        ) : null}
                        <Button type="primary" block size="large" onClick={handleCopyLink} style={{borderRadius: 8, height: 44}}>
                            {sharePassword ? '复制链接和密码' : '复制链接'}
                        </Button>
                    </div>
                )}
            </div>
        </Modal>
    );
}
