import { describe, expect, it } from 'vitest'

import { buildReportSourceVersionFields } from './reportSourceSelection'

describe('buildReportSourceVersionFields', () => {
  it('未选择能力时四个字段均为接口约定的空数组', () => {
    expect(
      buildReportSourceVersionFields({
        skills: [],
        selectedSkillIds: new Set(),
        mcps: [],
        selectedMcpIds: new Set(),
      }),
    ).toEqual({
      sse_mcp_source_version_ids: [],
      mcp_streamable_source_version_ids: [],
      skills_source_version_ids: [],
      builtin_tools_source_version_ids: [],
    })
  })

  it('使用技能 latestVersionId 并按 skillType 区分内置与外部技能', () => {
    expect(
      buildReportSourceVersionFields({
        skills: [
          { id: 'builtin-skill', latestVersionId: 101, skillType: 0 },
          { id: 'external-skill', latestVersionId: 'version-202', skillType: '1' },
          { id: 'not-selected', latestVersionId: 303, skillType: 1 },
        ],
        selectedSkillIds: new Set(['builtin-skill', 'external-skill']),
        mcps: [],
        selectedMcpIds: new Set(),
      }),
    ).toEqual({
      sse_mcp_source_version_ids: [],
      mcp_streamable_source_version_ids: [],
      skills_source_version_ids: ['version-202'],
      builtin_tools_source_version_ids: [101],
    })
  })

  it('按 protocol 的 sse/streamableHttp 实际枚举分流，并兼容大小写与 frontProtocol 别名', () => {
    expect(
      buildReportSourceVersionFields({
        skills: [],
        selectedSkillIds: new Set(),
        mcps: [
          { id: 'mcp-sse', protocol: 'SSE', groupId: 1001 },
          { id: 'mcp-streamable', protocol: 'streamableHttp' },
          { id: 'mcp-alias', frontProtocol: 'Streamable HTTP' },
          // protocol 优先于兼容字段 frontProtocol。
          { id: 'mcp-priority', protocol: 'sse', frontProtocol: 'streamableHttp', groupId: '1002' },
        ],
        selectedMcpIds: new Set(['mcp-sse', 'mcp-streamable', 'mcp-alias', 'mcp-priority']),
      }),
    ).toEqual({
      sse_mcp_source_version_ids: [{ 'mcp-sse': 1001 }, { 'mcp-priority': '1002' }],
      mcp_streamable_source_version_ids: ['mcp-streamable', 'mcp-alias'],
      skills_source_version_ids: [],
      builtin_tools_source_version_ids: [],
    })
  })

  it('混合选择时忽略无效版本或未知类型，并对各字段内 ID 去重', () => {
    expect(
      buildReportSourceVersionFields({
        skills: [
          { id: 'external-a', latestVersionId: 'same-version', skillType: 1 },
          { id: 'external-b', latestVersionId: 'same-version', skillType: '1' },
          { id: 'missing-version', skillType: 0 },
          { id: 'unknown-type', latestVersionId: 9, skillType: 2 },
        ],
        selectedSkillIds: new Set(['external-a', 'external-b', 'missing-version', 'unknown-type']),
        mcps: [
          { id: 88, protocol: 'sse', groupId: 1001 },
          { id: 88, protocol: 'sse', groupId: 1001 },
          { id: 'multi-sse', protocol: 'sse', sseGroupIds: [1002, '1003', 1002] },
          { id: 'missing-group', protocol: 'sse' },
          { id: 'unknown-mcp', protocol: 'websocket' },
        ],
        selectedMcpIds: new Set(['88', 'multi-sse', 'missing-group', 'unknown-mcp']),
      }),
    ).toEqual({
      sse_mcp_source_version_ids: [{ '88': 1001 }, { 'multi-sse': 1002 }, { 'multi-sse': '1003' }],
      mcp_streamable_source_version_ids: [],
      skills_source_version_ids: ['same-version'],
      builtin_tools_source_version_ids: [],
    })
  })
})
