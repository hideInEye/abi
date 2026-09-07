import type { McpSecurityExtensions, McpSecurityScheme } from '@/types/plug';
import { Button, Flex, Input, Select, Typography } from 'antd';

const { Text } = Typography;

interface SecuritySchemeSectionProps {
  readonly schemes: McpSecurityScheme[];
  readonly extensions: McpSecurityExtensions;
  readonly onSchemesChange: (next: McpSecurityScheme[]) => void;
  readonly onExtensionsChange: (next: McpSecurityExtensions) => void;
}

const AUTH_TYPE_OPTIONS = [
  { label: 'API Key', value: 'apiKey' },
  { label: 'HTTP (Basic/Bearer)', value: 'http' }
];

const KEY_LOCATION_OPTIONS = [
  { label: 'Header', value: 'header' },
  { label: 'Query', value: 'query' },
  { label: 'Cookie', value: 'cookie' }
];

const HTTP_SCHEME_OPTIONS = [
  { label: 'Bearer', value: 'bearer' },
  { label: 'Basic', value: 'basic' }
];

export const SecuritySchemeSection = ({
  schemes,
  extensions,
  onSchemesChange,
  onExtensionsChange
}: SecuritySchemeSectionProps) => {
  const idOptions = schemes.filter(s => s.id).map(s => ({ label: s.id, value: s.id }));

  const updateExt = <K extends keyof McpSecurityExtensions>(
    key: K,
    patch: Partial<NonNullable<McpSecurityExtensions[K]>>
  ) => {
    onExtensionsChange({
      ...extensions,
      [key]: { ...(extensions[key] || {}), ...patch }
    });
  };

  const addScheme = () => {
    const next: McpSecurityScheme = {
      id: `securityScheme_${schemes.length + 1}`,
      type: 'apiKey',
      name: 'X-API-Key',
      in: 'header',
      defaultCredential: ''
    };
    onSchemesChange([...schemes, next]);
  };

  const removeScheme = (idx: number) => {
    onSchemesChange(schemes.filter((_, i) => i !== idx));
  };

  const updateScheme = (idx: number, patch: Partial<McpSecurityScheme>) => {
    const merged = { ...schemes[idx], ...patch };
    onSchemesChange(schemes.map((s, i) => (i === idx ? merged : s)));
  };

  const cardStyle: React.CSSProperties = {
    background: '#f7f9fc',
    border: '1px solid #e6ebf2',
    borderRadius: 8,
    padding: 16,
    flex: 1,
    minWidth: 0
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#666',
    fontSize: 12,
    marginBottom: 4
  };

  return (
    <Flex vertical gap={16}>
      {/* 默认上行认证 */}
      <div style={cardStyle}>
        <Text strong style={{ fontSize: 14 }}>默认上行认证</Text>
        <div style={{ color: '#888', fontSize: 12, margin: '4px 0 12px' }}>
          作用于网关到上游服务的请求。
        </div>
        <Flex gap={12} align="flex-end">
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={labelStyle}>选择认证方案</span>
            <Select
              allowClear
              style={{ width: '100%' }}
              placeholder="请选择默认上行认证方案"
              value={extensions['server.defaultUpstreamSecurity']?.id}
              options={idOptions}
              onChange={v => updateExt('server.defaultUpstreamSecurity', { id: v })}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={labelStyle}>上行凭证</span>
            <Input
              placeholder="如未填写，将使用选中方案的默认凭证"
              value={extensions['server.defaultUpstreamSecurity']?.credential || ''}
              onChange={e => updateExt('server.defaultUpstreamSecurity', { credential: e.target.value })}
            />
          </div>
        </Flex>
      </div>

      {/* 添加认证方案 */}
      <Button type="dashed" onClick={addScheme} block>
        + 添加认证方案
      </Button>

      {/* 认证方案列表 */}
      {schemes.map((scheme, idx) => (
        <div key={idx} style={cardStyle}>
          <Flex gap={16} wrap="wrap" style={{ marginBottom: 12 }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={labelStyle}>
                <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>ID
              </span>
              <Input
                placeholder="认证方案唯一标识"
                value={scheme.id}
                onChange={e => updateScheme(idx, { id: e.target.value })}
              />
              <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                该认证方案的唯一标识，用于在 OpenAPI 规范中引用此配置。
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={labelStyle}>
                <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>认证类型
              </span>
              <Select
                style={{ width: '100%' }}
                value={scheme.type}
                options={AUTH_TYPE_OPTIONS}
                onChange={v => {
                  if (v === 'apiKey') {
                    updateScheme(idx, {
                      type: 'apiKey',
                      scheme: undefined,
                      name: scheme.name || 'X-API-Key',
                      in: scheme.in || 'header'
                    });
                  } else {
                    updateScheme(idx, {
                      type: 'http',
                      scheme: 'bearer',
                      name: undefined,
                      in: undefined
                    });
                  }
                }}
              />
              <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                {scheme.type === 'apiKey'
                  ? '通过固定的密钥字符串进行身份验证。'
                  : '使用 HTTP 协议原生支持的认证方式（Basic/Bearer）。'}
              </div>
            </div>
          </Flex>

          {/* API Key specific fields */}
          {scheme.type === 'apiKey' && (
            <>
              <Flex gap={16} wrap="wrap" style={{ marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={labelStyle}>密钥位置</span>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="选择位置"
                    value={scheme.in}
                    options={KEY_LOCATION_OPTIONS}
                    onChange={v => updateScheme(idx, { in: v })}
                  />
                  <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                    指定 API Key 在请求中的传递位置（Header 最常见）。
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={labelStyle}>密钥名称</span>
                  <Input
                    placeholder="X-API-Key"
                    value={scheme.name}
                    onChange={e => updateScheme(idx, { name: e.target.value })}
                  />
                  <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                    自定义请求头或参数的名称（如 Authorization、AppKey）。
                  </div>
                </div>
              </Flex>
              <div style={{ marginBottom: 12 }}>
                <span style={labelStyle}>默认凭证</span>
                <Input
                  placeholder="默认凭证值"
                  value={scheme.defaultCredential}
                  onChange={e => updateScheme(idx, { defaultCredential: e.target.value })}
                />
                <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                  选填，用于预先填入默认的密钥值，方便调试。
                </div>
              </div>
            </>
          )}

          {/* HTTP (Basic/Bearer) specific fields */}
          {scheme.type === 'http' && (
            <>
              <Flex gap={16} wrap="wrap" style={{ marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <span style={labelStyle}>Scheme</span>
                  <Select
                    style={{ width: '100%' }}
                    value={scheme.scheme}
                    options={HTTP_SCHEME_OPTIONS}
                    onChange={v => updateScheme(idx, { scheme: v })}
                  />
                  <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                    {scheme.scheme === 'bearer'
                      ? 'Bearer Token 认证，常用于 OAuth2 / JWT。'
                      : 'Basic 认证：用户名:密码 经 Base64 编码后放入 Authorization 头。'}
                  </div>
                </div>
              </Flex>
              <div style={{ marginBottom: 12 }}>
                <span style={labelStyle}>默认凭证</span>
                <Input
                  placeholder="默认凭证值"
                  value={scheme.defaultCredential}
                  onChange={e => updateScheme(idx, { defaultCredential: e.target.value })}
                />
              </div>
            </>
          )}

          {/* 删除按钮 */}
          <div style={{ textAlign: 'right' }}>
            <Button danger onClick={() => removeScheme(idx)}>
              删除
            </Button>
          </div>
        </div>
      ))}
    </Flex>
  );
};
