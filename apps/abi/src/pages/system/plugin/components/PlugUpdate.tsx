import { CloseOutlined } from '@ant-design/icons';
import { Form } from 'antd';
import { JsonEditor } from 'json-edit-react';
import { useEffect, useState } from 'react';

import type { PluginForm, PluginItem } from '@/types/plug';

interface PlugUpdateProps {
  readonly currentEdit: PluginItem | null;
  readonly onClose: () => void;
  readonly onSubmit: (formData: PluginForm) => void;
  readonly open: boolean;
}

export const PlugUpdate = ({ currentEdit, onClose, onSubmit, open }: PlugUpdateProps) => {
  const [form] = Form.useForm<PluginForm>();
  const [parseModeConfig, setParseModeConfig] = useState<any>({});
  const [serviceConfig, setServiceConfig] = useState<any>({});

  function resetFormData() {
    form.resetFields();
    setParseModeConfig({});
    setServiceConfig({});
  }

  useEffect(() => {
    if (currentEdit === null) {
      resetFormData();
      return;
    }

    if (currentEdit) {
      form.setFieldsValue({
        plugin_name: currentEdit.pluginName,
        plugin_type: currentEdit.pluginType,
        remark: currentEdit.remark
      });
      setParseModeConfig(JSON.parse(currentEdit.parseModeConfig));
      setServiceConfig(JSON.parse(currentEdit.serviceConfig));
    }
  }, [currentEdit]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onSubmit({
        ...values,
        parse_mode_config: parseModeConfig,
        service_config: serviceConfig
      });
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  useEffect(() => {
    if (!open) {
      resetFormData();
    }
  }, [open]);

  return (
    <ADrawer
      closeIcon={null}
      extra={<CloseOutlined onClick={onClose} />}
      open={open}
      title={currentEdit ? '编辑插件' : '新增插件'}
      width={800}
      footer={
        <DrawerFooter
          onClose={onClose}
          onSubmit={handleSubmit}
        />
      }
      onClose={onClose}
    >
      <AForm
        form={form}
        layout="vertical"
      >
        <Form.Item
          label="插件名称"
          name="plugin_name"
          rules={[{ message: '请输入插件名称', required: true }]}
        >
          <AInput placeholder="请输入插件名称" />
        </Form.Item>

        <Form.Item
          label="插件描述"
          name="remark"
          rules={[{ message: '请输入插件描述', required: true }]}
        >
          <AInput placeholder="请输入插件描述" />
        </Form.Item>

        <Form.Item
          label="插件类型"
          name="plugin_type"
          rules={[{ message: '请选择插件类型', required: true }]}
        >
          <ASelect>
            {/* <ASelect.Option value="web_page">网页</ASelect.Option> */}
            {/* <ASelect.Option value="mcp">MCP</ASelect.Option> */}
            <ASelect.Option value="api">服务接口</ASelect.Option>
          </ASelect>
        </Form.Item>

        <Form.Item
          label="插件解析配置"
          name="parse_mode_config"
        >
          <JsonEditor
            data={parseModeConfig}
            enableClipboard={true}
            minWidth={700}
            restrictAdd={true}
            restrictDelete={true}
            rootName=""
            onUpdate={data => {
              setParseModeConfig(data.newData);
            }}
          />
        </Form.Item>

        <Form.Item
          label="服务参数配置"
          name="service_config"
        >
          <JsonEditor
            data={serviceConfig}
            enableClipboard={true}
            minWidth={700}
            restrictAdd={true}
            restrictDelete={true}
            rootName=""
            onUpdate={data => {
              setServiceConfig(data.newData);
            }}
          />
        </Form.Item>
      </AForm>
    </ADrawer>
  );
};

interface DrawerFooterProps {
  readonly onClose: () => void;
  readonly onSubmit: () => void;
}

function DrawerFooter({ onClose, onSubmit }: DrawerFooterProps) {
  return (
    <AFlex justify="end">
      <ASpace>
        <AButton onClick={onClose}>取消</AButton>
        <AButton
          type="primary"
          onClick={onSubmit}
        >
          提交
        </AButton>
      </ASpace>
    </AFlex>
  );
}
