type PluginType = 'api' | 'mcp' | 'web_page';

export interface PluginDel {
  plugin_ids: string;
  plugin_type: PluginType;
  service_config?: string;
  space_id: string | number;
}

export interface PluginList {
  parseModeConfig: string;
  pluginId: number;
  pluginName: string;
  pluginType: PluginType;
  remark: string;
  serviceConfig: string;
  spaceId: number;
  status: number;
}

export interface PluginForm extends PluginList {
  parse_mode_config: string;
  plugin_name: string;
  plugin_type: PluginType;
  remark: string;
  service_config: string;
}

export interface PluginAddParams {
  parse_mode_config: string;
  pluginId: number;
  pluginName: string;
  pluginType: PluginType;
  remark: string;
  service_config: string;
  spaceId: number;
  status: 0 | 1;
}

export interface PluginItem extends PluginAddParams {
  createBy: string;
  createTime: string;
  parseModeConfig: string;
  serviceConfig: string;

  updateBy: string;
  updateTime: string;

  capabilities?: string[];
  protocol?: string;
  frontProtocol?: string;
  description?: string;
  enabled?: boolean;
  versionDetail?: {
    version?: string;
    release_date?: string;
    is_latest?: boolean;
  };
  allVersions?: Array<{ version: string; release_date?: string; is_latest?: boolean }>;
  remoteServerConfig?: {
    url?: string;
    exportPath?: string;
    frontEndpointConfigList?: any;
    serviceRef?: {
      namespaceId?: string;
      groupName?: string;
      serviceName?: string;
      transportProtocol?: string;
    };
  };
  backendEndpoints?: Array<{ address?: string; port?: number; protocol?: string; path?: string }>;
  toolSpec?: {
    tools?: McpToolItem[];
    toolsMeta?: Record<string, {
      invokeContext?: Record<string, any>;
      enabled?: boolean;
      templates?: Record<string, any>;
    }>;
    securitySchemes?: McpSecurityScheme[];
    extensions?: McpSecurityExtensions;
  } | null;
  name?: string;
}

export interface PlugEdit {
  parse_mode_config: string;
  plugin_id: number;
  plugin_name: string;
  plugin_type: PluginType;
  remark: string;
  service_config: string;
  space_id: number;
  status: 0 | 1;
  group_id: number;
}

export interface McpSecurityScheme {
  id: string;
  type: 'http' | 'apiKey';
  scheme?: string;
  defaultCredential?: string;
}

export interface McpSecurityExtensions {
  'server.defaultDownstreamSecurity'?: { id?: string; passthrough?: boolean };
  'server.defaultUpstreamSecurity'?: { id?: string; credential?: string };
}

export interface McpToolItem {
  name: string;
  description?: string;
  enabled?: boolean;
  inputSchema?: any;
  protocolTemplate?: string;
  passthroughAuth?: boolean;
  backendSecuritySchemeId?: string;
  clientSecuritySchemeId?: string;
}

export interface McpForm {
  mcp_name: string;
  version: string;
  description?: string;
  /** HTTP 转 MCP 开关：false=MCP 直接接入（默认）；true=HTTP 转 MCP */
  restToMcpSwitch?: boolean;
  /** 关闭开关时使用：完整的 MCP 服务端点 URL */
  mcpEndpointUrl?: string;
  /** 开启开关时使用：address/port/传输协议 */
  address?: string;
  port?: string;
  transport?: 'HTTP' | 'HTTPS';
  /** 协议类型：sse 或 streamableHttp */
  protocol?: 'sse' | 'streamableHttp';
  securitySchemes?: McpSecurityScheme[];
  securityExtensions?: McpSecurityExtensions;
  tools?: McpToolItem[];
}
