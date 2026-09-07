import { CloseOutlined, InboxOutlined, FileTextOutlined, ToolOutlined, SafetyOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Button, Modal, Tag, Upload, message, Flex } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useState } from 'react';

import type { McpSecurityScheme, McpToolItem } from '@/types/plug';

interface ImportOpenApiModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onOk: (data: { tools: McpToolItem[]; schemes: McpSecurityScheme[] }) => void;
}

/* ── 主题色 ── */
const C = {
  primary: '#5b7cf7',
  primaryLight: 'rgba(91, 124, 247, 0.08)',
  primaryBorder: 'rgba(91, 124, 247, 0.2)',
  accent: '#00d4ff',
  border: '#eef0f5',
  bg: '#f8f9fc',
  bgCard: '#ffffff',
  text: '#1a2340',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  success: '#10b981',
  successLight: 'rgba(16, 185, 129, 0.08)',
  danger: '#ef4444',
};

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

/** HTTP 方法颜色映射 */
const METHOD_COLORS: Record<string, string> = {
  GET: '#10b981',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  DELETE: '#ef4444',
  PATCH: '#8b5cf6',
  OPTIONS: '#6b7280',
  HEAD: '#6b7280',
};

export const ImportOpenApiModal = ({ open, onClose, onOk }: ImportOpenApiModalProps) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [parsedData, setParsedData] = useState<{ tools: McpToolItem[]; schemes: McpSecurityScheme[] } | null>(null);
  const [fileName, setFileName] = useState('');

  const resetState = () => {
    setFileList([]);
    setParsedData(null);
    setFileName('');
  };

  const handleFile = (file: File): boolean => {
    setFileName(file.name);
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

  /* ── 样式常量 ── */
  const sectionStyle: React.CSSProperties = {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  return (
    <Modal
      open={open}
      title={
        <Flex align="center" gap={8}>
          <FileTextOutlined style={{ color: C.primary, fontSize: 16 }} />
          <span style={{ fontWeight: 600, fontSize: 16 }}>从 OpenAPI 文件导入工具</span>
        </Flex>
      }
      onCancel={handleCancel}
      onOk={handleOk}
      okText="导入"
      cancelText="取消"
      closeIcon={<CloseOutlined />}
      width={680}
      destroyOnClose
      styles={{
        body: { maxHeight: '72vh', overflow: 'auto', padding: '20px 24px', background: C.bg },
        header: { borderBottom: `1px solid ${C.border}` },
      }}
      okButtonProps={{ className: 'btn-accent-gradient', style: { border: 'none', fontWeight: 600 }, disabled: !parsedData }}
    >
      {/* ── 上传区域 ── */}
      <div style={{ ...sectionStyle, marginBottom: 16 }}>
        <Upload.Dragger
          accept=".json"
          beforeUpload={handleFile}
          fileList={fileList}
          showUploadList={false}
          onChange={info => setFileList(info.fileList.slice(-1))}
          onRemove={() => {
            resetState();
            return true;
          }}
          maxCount={1}
          style={{
            border: `2px dashed ${parsedData ? C.success : C.primaryBorder}`,
            borderRadius: 10,
            background: parsedData ? C.successLight : C.bg,
            transition: 'all 0.3s',
          }}
        >
          {parsedData ? (
            <div style={{ padding: '16px 0' }}>
              <CheckCircleFilled style={{ fontSize: 32, color: C.success, marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                {fileName}
              </div>
              <div style={{ fontSize: 12, color: C.textSecondary }}>
                文件解析成功，点击可重新选择文件
              </div>
            </div>
          ) : (
            <div style={{ padding: '20px 0' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 56, height: 56, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.primaryLight}, rgba(0, 212, 255, 0.06))`,
                marginBottom: 12,
              }}>
                <InboxOutlined style={{ fontSize: 24, color: C.primary }} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
                点击或拖拽 OpenAPI 文件到此处
              </div>
              <div style={{ fontSize: 12, color: C.textMuted }}>
                目前仅支持 OpenAPI 3.x JSON 格式
              </div>
            </div>
          )}
        </Upload.Dragger>
      </div>

      {/* ── 解析结果 ── */}
      {parsedData && (
        <>
          {/* 统计概览 */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{
              ...sectionStyle,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 0,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 8,
                background: `linear-gradient(135deg, ${C.primaryLight}, rgba(0, 212, 255, 0.06))`,
                color: C.primary, fontSize: 18,
              }}>
                <ToolOutlined />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{parsedData.tools.length}</div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>个工具</div>
              </div>
            </div>
            <div style={{
              ...sectionStyle,
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 0,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: 8,
                background: `linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.04))`,
                color: C.success, fontSize: 18,
              }}>
                <SafetyOutlined />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{parsedData.schemes.length}</div>
                <div style={{ fontSize: 12, color: C.textSecondary }}>个认证方案</div>
              </div>
            </div>
          </div>

          {/* 工具列表 */}
          {parsedData.tools.length > 0 && (
            <div style={sectionStyle}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                paddingBottom: 10, marginBottom: 12,
                borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: 6,
                  background: `linear-gradient(135deg, ${C.primaryLight}, rgba(0, 212, 255, 0.06))`,
                  color: C.primary, fontSize: 12,
                }}>
                  <ToolOutlined />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>工具列表</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: C.textMuted }}>
                  共 {parsedData.tools.length} 个
                </span>
              </div>
              <div style={{ maxHeight: 280, overflow: 'auto' }}>
                {parsedData.tools.map((tool, idx) => {
                  // 从 protocolTemplate 提取 method
                  let method = '';
                  try {
                    const tpl = JSON.parse(tool.protocolTemplate || '{}');
                    method = tpl?.requestTemplate?.method || '';
                  } catch { /* ignore */ }
                  const paramCount = tool.inputSchema?.properties
                    ? Object.keys(tool.inputSchema.properties).length
                    : 0;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        padding: '10px 12px',
                        marginBottom: idx < parsedData.tools.length - 1 ? 4 : 0,
                        borderRadius: 8,
                        background: idx % 2 === 0 ? 'transparent' : C.bg,
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* 序号 */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: '50%',
                        background: C.primaryLight, color: C.primary,
                        fontSize: 11, fontWeight: 600, flexShrink: 0, marginTop: 1,
                      }}>
                        {idx + 1}
                      </span>
                      {/* 内容 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: tool.description ? 3 : 0 }}>
                          {method && (
                            <Tag style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                              color: METHOD_COLORS[method] || C.textSecondary,
                              border: `1px solid ${METHOD_COLORS[method] || C.border}33`,
                              background: `${METHOD_COLORS[method] || C.textMuted}11`,
                              borderRadius: 4, padding: '0 6px', lineHeight: '18px',
                            }}>
                              {method}
                            </Tag>
                          )}
                          <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>
                            {tool.name}
                          </span>
                          {paramCount > 0 && (
                            <span style={{ fontSize: 11, color: C.textMuted }}>
                              {paramCount} 个参数
                            </span>
                          )}
                        </div>
                        {tool.description && (
                          <div style={{
                            fontSize: 12, color: C.textSecondary, lineHeight: 1.5,
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          }}>
                            {tool.description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 认证方案列表 */}
          {parsedData.schemes.length > 0 && (
            <div style={{ ...sectionStyle, marginTop: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                paddingBottom: 10, marginBottom: 12,
                borderBottom: `1px solid ${C.border}`,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: 6,
                  background: `linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.04))`,
                  color: C.success, fontSize: 12,
                }}>
                  <SafetyOutlined />
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>认证方案</span>
              </div>
              <Flex gap={8} wrap="wrap">
                {parsedData.schemes.map((scheme, idx) => (
                  <Tag
                    key={idx}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 6,
                      border: `1px solid ${C.primaryBorder}`,
                      background: C.primaryLight,
                      color: C.primary,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {scheme.id}
                    <span style={{ marginLeft: 4, color: C.textMuted, fontWeight: 400 }}>
                      ({scheme.type})
                    </span>
                  </Tag>
                ))}
              </Flex>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
