import React, { useState } from 'react';
import { Modal, Select, InputNumber, Button, Radio, ColorPicker, Space } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: ChartConfig) => void;
  defaultConfig?: ChartConfig;
}

interface ChartConfig {
  theme: string;
  font: string;
  fontSize: number;
  chartStyle: {
    color: string;
    textColor: string;
  };
}

const ChartConfigModal: React.FC<Props> = ({
  open,
  onClose,
  onConfirm,
  defaultConfig
}) => {
  const [config, setConfig] = useState<ChartConfig>(defaultConfig || {
    theme: 'light',
    font: 'default',
    fontSize: 12,
    chartStyle: {
      color: '#1677ff',
      textColor: '#333333'
    }
  });

  // 主题颜色选项
  const themeColors = [
    { label: '官方', value: '#2FA4FF,#7ACBFF,#A67AFF,#F7A45C,#6E6E6E,#50C878' },
    { label: '智能', value: '#2F6BFF,#2FAFCC,#7D7DFF,#F7931E,#2FC48C,#2C4F88' },
    { label: '鲜明', value: '#2F6BFF,#FF9B3F,#2FB4C4,#A050E7,#1296DB,#FFAA4C' },
    { label: '舒适', value: '#2DAA8F,#2F3F6C,#6A5F8C,#F28E44,#3A6C8C,#4CA6D4' },
    { label: '简约', value: '#304CFF,#20C997,#FF8C42,#A050E7,#3FA9F5,#FF6F61' }
  ];

  // 字体选项
  const fontOptions = [
    { label: '默认', value: 'sans-serif' },
    { label: '微软雅黑', value: 'Microsoft YaHei' },
    { label: '宋体', value: 'SimSun' },
    { label: '黑体', value: 'SimHei' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Times New Roman', value: 'Times New Roman' }
  ];

  const handleConfirm = () => {
    onConfirm(config);
    onClose();
  };

  // 处理颜色选择
  const handleColorChange = (key: string, color: string) => {
    setConfig(prev => ({
      ...prev,
      chartStyle: {
        ...prev.chartStyle,
        [key]: color
      }
    }));
  };

  return (
    <Modal
      title="图表配置"
      open={open}
      width={400}
      closable={false}
      closeIcon={
        <Button
          icon={<CloseOutlined />}
          type="text"
          onClick={onClose}
        />
      }
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" onClick={handleConfirm}>
            确认
          </Button>
        </div>
      }
      style={{
        zIndex: 999999
      }}
    >
      <div className="space-y-6">
        <div>
          <div className="mb-2">通用</div>
          <div className="pl-4 space-y-4">
            {/* 主题色 */}
            <div className="flex items-center">
              <div className="w-16">主题色</div>
              <Select
                value={config.chartStyle.color}
                onChange={value => handleColorChange('color', value)}
                options={themeColors}
                className='w-full'
                optionRender={(option) => (
                  <Space>
                    <div className='cursor-pointer flex items-center justify-center relative gap gap-2'>
                      {option.data.value.split(',').map((color: string) => (
                        <div
                          key={color}
                          className="w-6 h-6 rounded" // 添加 flex 布局
                          style={{ backgroundColor: color }}
                        />
                      ))}
                      <span className="ml-2">{option.label}</span>
                    </div>
                  </Space>
                )}
              />
            </div>

            {/* 文字颜色 */}
            <div className="flex items-center">
              <div className="w-16">文字颜色</div>
              <ColorPicker
                value={config.chartStyle.textColor}
                onChange={color => handleColorChange('textColor', color?.toHexString())}
                style={{ width: 120 }}
              />
            </div>

            {/* 字体和字号 */}
            <div className="flex items-center">
              <div className="w-16">字体</div>
              <div className="flex items-center gap-2">
                <Select
                  value={config.font}
                  onChange={font => setConfig({ ...config, font })}
                  options={fontOptions}
                  style={{ width: 120 }}
                />
                <InputNumber
                  value={config.fontSize}
                  onChange={fontSize => setConfig({ ...config, fontSize: fontSize || 12 })}
                  min={8}
                  max={72}
                  style={{ width: 80 }}
                />
                <span className="text-sm">px</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2">样式</div>
          <div className="pl-4 space-y-4">
            {/* 这里可以添加更多样式配置选项 */}
            <div className="flex items-center">
              <div className="w-16">主题模式</div>
              <Radio.Group
                value={config.theme}
                onChange={e => setConfig({ ...config, theme: e.target.value })}
              >
                <Radio value="light">亮色</Radio>
                <Radio value="dark">暗色</Radio>
              </Radio.Group>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ChartConfigModal;