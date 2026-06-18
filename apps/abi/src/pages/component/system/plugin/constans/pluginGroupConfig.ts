export const pluginGroupConfig = {
  button: '添加MCP分组',
  inputLabel: 'MCP分组名称',
  inputPlaceholder: '请输入MCP分组名称',
  modalAddTitle: '新增MCP分组',
  modalEditTitle: '编辑MCP分组',
  panelTitle: 'MCP分组',
  rule: [
    [{ message: '请输入MCP分组名称', required: true }]
  ],
  type: 'mcp-sse' as const,
  /** 创建分组时可选的分组类型 */
  groupTypeOptions: [
    { label: 'MCP-SSE', value: 'mcp-sse' },
    { label: 'MCP-Streamable', value: 'mcp-streamable' },
  ],
  /** 查询分组时同时拉取的类型列表 */
  queryTypes: ['mcp-sse', 'mcp-streamable'] as const,
}; 