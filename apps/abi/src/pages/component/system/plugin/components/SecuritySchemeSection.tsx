import { getToken } from '@/store/slice/auth/shared';
import type { McpSecurityExtensions, McpSecurityScheme } from '@/types/plug';

interface SecuritySchemeSectionProps {
  readonly schemes: McpSecurityScheme[];
  readonly extensions: McpSecurityExtensions;
  readonly onSchemesChange: (next: McpSecurityScheme[]) => void;
  readonly onExtensionsChange: (next: McpSecurityExtensions) => void;
}

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
    const token = getToken();
    const next: McpSecurityScheme = {
      id: `securityScheme_${schemes.length + 1}`,
      type: 'http',
      scheme: 'bearer',
      defaultCredential: token ? `Bearer ${token}` : ''
    };
    onSchemesChange([...schemes, next]);
  };

  const removeScheme = (idx: number) => {
    onSchemesChange(schemes.filter((_, i) => i !== idx));
  };

  const updateScheme = (idx: number, patch: Partial<McpSecurityScheme>) => {
    const merged = { ...schemes[idx], ...patch };
    if (merged.type === 'http' && merged.scheme === 'bearer') {
      const token = getToken();
      merged.defaultCredential = token ? `Bearer ${token}` : '';
    }
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

  return (
    <AFlex vertical gap={16}>
      {/* 默认下行 / 默认上行 双卡片 */}
      <AFlex gap={16} wrap="wrap">
        <div style={cardStyle}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>默认下行认证</div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
            作用于客户端到网关的请求（如 tools/list）以及未显式配置 security 的工具。
          </div>
          <AFlex gap={12} align="flex-end">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>选择认证方案</div>
              <ASelect
                allowClear
                style={{ width: '100%' }}
                placeholder="请选择默认下行认证方案"
                value={extensions['server.defaultDownstreamSecurity']?.id}
                options={idOptions}
                onChange={v => updateExt('server.defaultDownstreamSecurity', { id: v })}
              />
            </div>
            <div>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>启用透明认证</div>
              <AFlex gap={6} align="center" style={{ height: 32 }}>
                <ASwitch
                  disabled={!extensions['server.defaultDownstreamSecurity']?.id}
                  checked={extensions['server.defaultDownstreamSecurity']?.passthrough || false}
                  onChange={v => updateExt('server.defaultDownstreamSecurity', { passthrough: v })}
                />
                <span style={{ color: '#888', fontSize: 12 }}>
                  {extensions['server.defaultDownstreamSecurity']?.passthrough ? '启用' : '禁用'}
                </span>
              </AFlex>
            </div>
          </AFlex>
        </div>

        <div style={cardStyle}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>默认上行认证</div>
          <div style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
            作用于网关访问后端（如 requestTemplate.security）时的默认配置。
          </div>
          <AFlex gap={12} align="flex-end">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>选择认证方案</div>
              <ASelect
                allowClear
                style={{ width: '100%' }}
                placeholder="请选择默认上行认证方案"
                value={extensions['server.defaultUpstreamSecurity']?.id}
                options={idOptions}
                onChange={v => updateExt('server.defaultUpstreamSecurity', { id: v })}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>凭证覆盖</div>
              <AInput
                placeholder="调用后端时可选的凭证覆盖"
                disabled={!extensions['server.defaultUpstreamSecurity']?.id}
                value={extensions['server.defaultUpstreamSecurity']?.credential}
                onChange={e =>
                  updateExt('server.defaultUpstreamSecurity', { credential: e.target.value })
                }
              />
            </div>
          </AFlex>
        </div>
      </AFlex>

      {/* 添加认证方案按钮 */}
      <div>
        <AButton type="primary" onClick={addScheme}>
          添加认证方案
        </AButton>
      </div>

      {/* 已添加的认证方案条目 */}
      {schemes.map((scheme, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid #e6ebf2',
            borderRadius: 8,
            padding: 16,
            background: '#fff'
          }}
        >
          <AFlex gap={12} align="flex-end" wrap="wrap">
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>ID
              </div>
              <AInput
                value={scheme.id}
                onChange={e => updateScheme(idx, { id: e.target.value })}
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>认证类型
              </div>
              <ASelect
                style={{ width: '100%' }}
                value={scheme.type}
                onChange={v =>
                  updateScheme(idx, {
                    type: v,
                    scheme: v === 'http' ? scheme.scheme || 'bearer' : undefined
                  })
                }
                options={[
                  { label: 'HTTP (Basic/Bearer)', value: 'http' },
                  { label: 'API Key', value: 'apiKey' }
                ]}
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>Scheme</div>
              <ASelect
                allowClear
                disabled={scheme.type !== 'http'}
                style={{ width: '100%' }}
                placeholder="选择认证方案"
                value={scheme.scheme}
                options={[
                  { label: 'bearer', value: 'bearer' },
                  { label: 'basic', value: 'basic' }
                ]}
                onChange={v => updateScheme(idx, { scheme: v })}
              />
            </div>
            <AButton danger onClick={() => removeScheme(idx)}>
              删除
            </AButton>
          </AFlex>
          <div style={{ marginTop: 12 }}>
            <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>默认凭证</div>
            <AInput
              placeholder={scheme.scheme === 'bearer' ? '已自动填充平台当前登录凭证，可手动修改' : '默认凭证值'}
              value={scheme.defaultCredential}
              onChange={e => updateScheme(idx, { defaultCredential: e.target.value })}
            />
          </div>
        </div>
      ))}
    </AFlex>
  );
};
