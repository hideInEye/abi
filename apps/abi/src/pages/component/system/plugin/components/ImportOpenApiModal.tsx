import { InboxOutlined } from '@ant-design/icons';
import { message, Modal, Upload } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useState } from 'react';

import type { McpSecurityScheme, McpToolItem } from '@/types/plug';

interface ImportOpenApiModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onOk: (data: { tools: McpToolItem[]; schemes: McpSecurityScheme[] }) => void;
}

// 简化版 OpenAPI 3.x → McpTool 转换（纯前端，不依赖 swagger2openapi/js-yaml）
const extractFromOpenApi = (doc: any): { tools: McpToolItem[]; schemes: McpSecurityScheme[] } => {
  const tools: McpToolItem[] = [];
  const schemes: McpSecurityScheme[] = [];

  const secs = doc?.components?.securitySchemes || {};
  Object.keys(secs).forEach(name => {
    const s = secs[name];
    if (!s) return;
    schemes.push({
      id: name,
      type: s.type === 'apiKey' ? 'apiKey' : 'http',
      scheme: s.scheme,
      defaultCredential: ''
    });
  });

  const paths = doc?.paths || {};
  const METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
  Object.keys(paths).forEach(path => {
    const pathItem = paths[path] || {};
    METHODS.forEach(method => {
      const op = pathItem[method];
      if (!op) return;
      let toolName: string = op.operationId || '';
      if (!toolName) {
        const pathName = path.replace(/[{}]/g, '').replace(/\//g, '_');
        toolName = method + pathName.charAt(0).toUpperCase() + pathName.slice(1);
      }
      const properties: Record<string, any> = {};
      const required: string[] = [];
      (op.parameters || []).forEach((p: any) => {
        if (!p?.name) return;
        properties[p.name] = {
          type: p.schema?.type || 'string',
          description: p.description || ''
        };
        if (p.required) required.push(p.name);
      });
      tools.push({
        name: toolName,
        description: op.summary || op.description || '',
        enabled: true,
        inputSchema: {
          type: 'object',
          properties,
          ...(required.length > 0 ? { required } : {})
        },
        protocolTemplate: JSON.stringify(
          {
            requestTemplate: { method: method.toUpperCase(), url: path }
          },
          null,
          2
        ),
        passthroughAuth: false
      });
    });
  });

  return { tools, schemes };
};

export const ImportOpenApiModal = ({ open, onClose, onOk }: ImportOpenApiModalProps) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [parsedData, setParsedData] = useState<{ tools: McpToolItem[]; schemes: McpSecurityScheme[] } | null>(null);

  const resetState = () => {
    setFileList([]);
    setParsedData(null);
  };

  const handleFile = (file: File): boolean => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const text = String(e.target?.result || '');
        const doc = JSON.parse(text);
        if (doc?.swagger && !doc?.openapi) {
          message.warning('当前仅支持 OpenAPI 3.x JSON 文件，Swagger 2.0 需要先转换');
          return;
        }
        if (!doc?.openapi && !doc?.paths) {
          message.error('文件格式无效，请上传 OpenAPI 3.x JSON');
          return;
        }
        const data = extractFromOpenApi(doc);
        setParsedData(data);
        message.success(`解析成功：${data.tools.length} 个工具，${data.schemes.length} 个认证方案`);
      } catch (err) {
        console.error('parse openapi failed', err);
        message.error('文件解析失败，请确保是合法 JSON');
      }
    };
    reader.onerror = () => message.error('文件读取失败');
    reader.readAsText(file);
    return false; // 阻止自动上传
  };

  const handleOk = () => {
    if (!parsedData) {
      message.warning('请先选择 OpenAPI 文件');
      return;
    }
    onOk(parsedData);
    resetState();
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  return (
    <Modal
      open={open}
      title="从 OpenAPI 文件导入工具"
      onCancel={handleCancel}
      onOk={handleOk}
      okText="导入"
      cancelText="取消"
      width={560}
      destroyOnClose
    >
      <Upload.Dragger
        accept=".json"
        beforeUpload={handleFile}
        fileList={fileList}
        onChange={info => setFileList(info.fileList.slice(-1))}
        onRemove={() => {
          resetState();
          return true;
        }}
        maxCount={1}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击或拖拽 OpenAPI 文件到此处</p>
        <p className="ant-upload-hint">目前仅支持 OpenAPI 3.x JSON 格式</p>
      </Upload.Dragger>
      {parsedData && (
        <div style={{ marginTop: 12, color: '#52c41a', fontSize: 13 }}>
          ✔ 解析成功：{parsedData.tools.length} 个工具，{parsedData.schemes.length} 个认证方案
        </div>
      )}
    </Modal>
  );
};
