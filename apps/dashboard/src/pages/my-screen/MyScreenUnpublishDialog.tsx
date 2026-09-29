import {Modal} from 'antd';

interface MyScreenUnpublishDialogProps {
    onCancel: () => void;
    onConfirm: () => void | Promise<void>;
    open: boolean;
}

export default function MyScreenUnpublishDialog({onCancel, onConfirm, open}: MyScreenUnpublishDialogProps) {
    return (
        <Modal
            title="确认"
            open={open}
            onOk={onConfirm}
            onCancel={onCancel}
            okText="确认"
            cancelText="取消"
        >
            <div style={{color: '#aeaeae', padding: 10}}>确认要取消发布吗？</div>
        </Modal>
    );
}
