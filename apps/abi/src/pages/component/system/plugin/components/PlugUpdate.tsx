import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Form, message } from 'antd';
import copy from 'copy-to-clipboard';
import { JsonEditor } from 'json-edit-react';
import { useEffect, useState } from 'react';
import './JsonEditorTextBtn.css';

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
  const PARSE_MODE_CONFIG_EXAMPLE = {
    openapi: '3.1.0',
    info: { title: 'FastAPI', version: '0.1.0' },
    paths: {
      '/api/v1/services/Iff8080810196767c767c3ac001967bd4ae490078': {
        post: {
          summary: '预期空气质量指数',
          description: '基于DEWP, TEMP, WSPM, O3, PM25预测空气质量指数',
          operationId: 'CNN-LSTM-RH-SVC',
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/InputData' } } },
            required: true
          },
          responses: {
            200: {
              description: 'Successful Response',
              content: {
                'application/json': {
                  schema: {
                    items: { $ref: '#/components/schemas/DataItemWithTotal' },
                    type: 'array',
                    title: 'Response Sum Columns'
                  }
                }
              }
            },
            422: {
              description: 'Validation Error',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HTTPValidationError' } } }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        DataItem: {
          properties: {
            DEWP: { type: 'number', title: 'Dewp', description: 'DEWP' },
            TEMP: { type: 'number', title: 'Temp', description: 'TEMP' },
            WSPM: { type: 'number', title: 'Wspm', description: 'WSPM' },
            O3: { type: 'number', title: 'O3', description: 'O3' },
            PM25: { type: 'number', title: 'Pm25', description: 'PM25' }
          },
          type: 'object',
          required: ['DEWP', 'TEMP', 'WSPM', 'O3', 'PM25'],
          title: 'DataItem'
        },
        DataItemWithTotal: {
          properties: {
            DEWP: { type: 'number', title: 'Dewp', description: 'DEWP' },
            TEMP: { type: 'number', title: 'Temp', description: 'TEMP' },
            WSPM: { type: 'number', title: 'Wspm', description: 'WSPM' },
            O3: { type: 'number', title: 'O3', description: 'O3' },
            PM25: { type: 'number', title: 'Pm25', description: 'PM25' },
            total: { type: 'number', title: 'Total', description: 'Sum of DEWP, TEMP, WSPM, O3, PM25' }
          },
          type: 'object',
          required: ['DEWP', 'TEMP', 'WSPM', 'O3', 'PM25', 'total'],
          title: 'DataItemWithTotal'
        },
        HTTPValidationError: {
          properties: { detail: { items: { $ref: '#/components/schemas/ValidationError' }, type: 'array', title: 'Detail' } },
          type: 'object',
          title: 'HTTPValidationError'
        },
        InputData: {
          properties: { data: { items: { $ref: '#/components/schemas/DataItem' }, type: 'array', title: 'Data' } },
          type: 'object',
          required: ['data'],
          title: 'InputData'
        },
        ValidationError: {
          properties: {
            loc: { items: { anyOf: [{ type: 'string' }, { type: 'integer' }] }, type: 'array', title: 'Location' },
            msg: { type: 'string', title: 'Message' },
            type: { type: 'string', title: 'Error Type' }
          },
          type: 'object',
          required: ['loc', 'msg', 'type'],
          title: 'ValidationError'
        }
      }
    }
  };
  const SERVICE_CONFIG_EXAMPLE = {
    "base_url": "https://123.181.192.131:8900"
  };

  function resetFormData() {
    form.resetFields();
    setParseModeConfig({});
    setServiceConfig({});
  }

  useEffect(() => {
    if (!open) {
      resetFormData();
      return;
    }

    // 当打开抽屉时，根据 currentEdit 设置数据
    if (open && currentEdit) {
      form.setFieldsValue({
        plugin_name: currentEdit.pluginName,
        plugin_type: currentEdit.pluginType,
        remark: currentEdit.remark,
        parse_mode_config: JSON.parse(currentEdit.parseModeConfig),
        service_config: JSON.parse(currentEdit.serviceConfig)
      });
      setParseModeConfig(JSON.parse(currentEdit.parseModeConfig));
      setServiceConfig(JSON.parse(currentEdit.serviceConfig));
    }
  }, [open, currentEdit, form]);

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
          label={
            <div className="flex items-center">
              <span>插件解析配置</span>
              <APopover
                trigger="hover"
                placement="right"
                content={
                  <div style={{ maxWidth: 800, maxHeight: '60vh', overflow: 'auto' }}>
                    <div className="mb-2">
                      <ASpace>
                        <AButton
                          size="small"
                          onClick={() => {
                            copy(JSON.stringify(PARSE_MODE_CONFIG_EXAMPLE, null, 2));
                            message.success('已复制示例');
                          }}
                        >
                          复制示例
                        </AButton>
                      </ASpace>
                    </div>
                    <pre style={{ margin: 0 }}>{JSON.stringify(PARSE_MODE_CONFIG_EXAMPLE, null, 2)}</pre>
                  </div>
                }
              >
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
              </APopover>
            </div>
          }
          name="parse_mode_config"
          required
          rules={[{ message: '请配置插件解析配置', required: true }]}
        >
         <div className="json-editor-fix-container">
          <JsonEditor
            data={parseModeConfig}
            enableClipboard={({success})=>{
              if(success)message.success('复制成功')
            }}
            minWidth={700}
            restrictAdd={true}
            restrictDelete={true}
            rootName=""
            onUpdate={data => {
              setParseModeConfig(data.newData);
              form.setFieldsValue({ parse_mode_config: data.newData });
            }}
          />
         </div>
        </Form.Item>

        <Form.Item
          label={
            <div className="flex items-center">
              <span>服务参数配置</span>
              <APopover
                trigger="hover"
                placement="rightTop"
                content={
                  <div style={{ maxWidth: 800, maxHeight: '60vh', overflow: 'auto' }}>
                    <div className="mb-2">
                      <ASpace>
                        <AButton
                          size="small"
                          onClick={() => {
                            copy(JSON.stringify(SERVICE_CONFIG_EXAMPLE, null, 2));
                            message.success('已复制示例');
                          }}
                        >
                          复制示例
                        </AButton>
                      </ASpace>
                    </div>
                    <pre style={{ margin: 0 }}>{JSON.stringify(SERVICE_CONFIG_EXAMPLE, null, 2)}</pre>
                  </div>
                }
              >
                <QuestionCircleOutlined style={{ marginLeft: 8, color: '#999', cursor: 'pointer' }} />
              </APopover>
            </div>
          }
          name="service_config"
          required
          rules={[{ message: '请配置服务参数配置', required: true }]}
        >
         <div className="json-editor-fix-container">
          <JsonEditor
            data={serviceConfig}
            enableClipboard={true}
            minWidth={700}
            restrictAdd={true}
            restrictDelete={true}
            rootName=""
            onUpdate={data => {
              setServiceConfig(data.newData);
              form.setFieldsValue({ service_config: data.newData });
            }}
          />
         </div>
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
          确认
        </AButton>
      </ASpace>
    </AFlex>
  );
}
