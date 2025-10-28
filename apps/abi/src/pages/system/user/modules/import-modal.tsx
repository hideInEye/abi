import { InboxOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { message, Upload } from 'antd';
import React, { useState, useRef } from 'react';

const { Dragger } = Upload;

interface ImportModalProps {
    visible: boolean;
    onClose: () => void;
    onImport: (file: File, updateExisting: boolean) => Promise<void>;
    onLoadTel: (url: string, params: any, fileName: string) => Promise<void>; // 修改返回类型
}

const ImportModal: React.FC<ImportModalProps> = ({ visible, onClose, onImport, onLoadTel }) => {
    const [fileList, setFileList] = useState<UploadProps['fileList']>([]);
    const [updateExisting, setUpdateExisting] = useState(false);
    const [loading, setLoading] = useState(false);
    const draggerRef = useRef<any>(null);

    const props: UploadProps = {
        beforeUpload: (file) => {
            setFileList([file]);
            return false;
        },
        fileList,
        maxCount: 1,
        accept: '.xls,.xlsx',
    };

    const handleDownloadTemplate = () => {
        onLoadTel();
    };

    const handleImport = async () => {
        if (!fileList.length) {
            message.warning('请选择要导入的文件');
            return;
        }
        try {
            setLoading(true);
            await onImport(fileList[0] as File, updateExisting);
            message.success('导入成功');
            onClose();
        } catch (error) {
            message.error('导入失败: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AModal
            title="用户导入"
            open={visible}
            onCancel={onClose}
            footer={null}
            width={600}
            destroyOnClose
        >
            <div style={{ marginBottom: 24 }}>
                <Dragger
                    {...props}
                    ref={draggerRef}
                    style={{ border: '1px dashed #d9d9d9' }}
                    onDrop={(e) => {
                        e.preventDefault();
                        // 阻止默认行为防止Modal关闭
                    }}
                >
                    <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">单击或拖拽文件到此区域上传</p>
                    <p className="ant-upload-hint">
                        仅支持.xls、.xlsx格式文件，单次上传不超过10MB
                    </p>
                </Dragger>
            </div>

            <div style={{ marginBottom: 24 }}>
                <ACheckbox checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)}>
                    更新已存在的用户数据
                </ACheckbox>
            </div>

            <div style={{ marginBottom: 24 }}>
                <AButton type="link" onClick={handleDownloadTemplate} style={{ padding: 0 }}>
                    下载导入模板
                </AButton>
            </div>

            <div style={{ textAlign: 'right' }}>
                <AButton style={{ marginRight: 8 }} onClick={onClose}>取消</AButton>
                <AButton type="primary" loading={loading} onClick={handleImport}>确定</AButton>
            </div>
        </AModal>
    );
};

export default ImportModal;
