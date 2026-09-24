import {Input, Modal} from 'antd';

interface ProjectRenameDialogProps {
    loading: boolean;
    onCancel: () => void;
    onChange: (value: string) => void;
    onConfirm: () => void | Promise<void>;
    open: boolean;
    value: string;
}

export default function ProjectRenameDialog({loading, onCancel, onChange, onConfirm, open, value}: ProjectRenameDialogProps) {
    return (
        <Modal
            cancelText="取消"
            centered
            confirmLoading={loading}
            okText="确定"
            onCancel={onCancel}
            onOk={onConfirm}
            open={open}
            title="重命名大屏"
            width={420}
        >
            <Input
                autoFocus
                maxLength={50}
                onChange={event => onChange(event.target.value)}
                onPressEnter={() => void onConfirm()}
                placeholder="请输入项目名称"
                value={value}
            />
        </Modal>
    );
}
