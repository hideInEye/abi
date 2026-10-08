import React from 'react';
import { Modal } from 'antd';
import { FullscreenExitOutlined } from '@ant-design/icons';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const FullscreenModal: React.FC<Props> = ({ open, onClose, children }) => {
  return (
    <Modal
      open={open}
      footer={null}
      closable={false}
      width="90%"
      styles={{
        body: {
          height: '85vh',
          padding: '20px',
          position: 'relative',
          overflowY: 'auto'
        },
        content: {
          maxWidth: '100%',
          paddingBottom: 0
        },
        mask: {
          backgroundColor: 'rgba(0, 0, 0, 0.45)'
        }
      }}
      className="fullscreen-modal"
    >
      <div className="absolute right-1 top-0 z-10">
        <div 
          className="flex items-center justify-center w-8 h-8 rounded bg-white shadow-md cursor-pointer hover:opacity-70"
          onClick={onClose}
        >
          <FullscreenExitOutlined className="text-lg" />
        </div>
      </div>
      <div className="h-full overflow-auto">
        {children}
      </div>
    </Modal>
  );
};

export default FullscreenModal; 