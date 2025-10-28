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
}
