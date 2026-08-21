import type { ReportSourceVersionFields, SourceVersionId } from '@/service/api/report'

export interface SkillSourceOption {
  id?: unknown
  latestVersionId?: unknown
  skillType?: unknown
}

export interface McpSourceOption {
  id?: unknown
  protocol?: unknown
  frontProtocol?: unknown
}

interface BuildReportSourceVersionFieldsOptions {
  skills: readonly SkillSourceOption[]
  selectedSkillIds: ReadonlySet<string>
  mcps: readonly McpSourceOption[]
  selectedMcpIds: ReadonlySet<string>
}

function isSourceVersionId(value: unknown): value is SourceVersionId {
  return (typeof value === 'string' && value.trim() !== '') || (typeof value === 'number' && Number.isFinite(value))
}

function toProtocolKey(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '')
}

function toReportField(ids: SourceVersionId[]): SourceVersionId[] {
  return [...new Map(ids.map((id) => [String(id), id])).values()]
}

/**
 * 将输入框当前选中的技能与 MCP 映射为报告接口的四类源版本字段。
 * 技能必须使用 latestVersionId；MCP register/list 的 id 即当前源版本 ID。
 */
export function buildReportSourceVersionFields({ skills, selectedSkillIds, mcps, selectedMcpIds }: BuildReportSourceVersionFieldsOptions): ReportSourceVersionFields {
  const builtinToolVersionIds: SourceVersionId[] = []
  const externalSkillVersionIds: SourceVersionId[] = []
  const sseMcpVersionIds: SourceVersionId[] = []
  const streamableMcpVersionIds: SourceVersionId[] = []

  skills.forEach((skill) => {
    if (!selectedSkillIds.has(String(skill.id)) || !isSourceVersionId(skill.latestVersionId)) return

    const skillType = String(skill.skillType ?? '').trim()
    if (skillType === '0') {
      builtinToolVersionIds.push(skill.latestVersionId)
    } else if (skillType === '1') {
      externalSkillVersionIds.push(skill.latestVersionId)
    }
  })

  mcps.forEach((mcp) => {
    if (!selectedMcpIds.has(String(mcp.id)) || !isSourceVersionId(mcp.id)) return

    // 新契约优先使用 protocol；frontProtocol 仅兼容当前 register/list 列表字段。
    const protocol = toProtocolKey(mcp.protocol || mcp.frontProtocol)
    if (protocol === 'sse') {
      sseMcpVersionIds.push(mcp.id)
    } else if (protocol === 'streamable' || protocol === 'streamablehttp') {
      streamableMcpVersionIds.push(mcp.id)
    }
  })

  return {
    sse_mcp_source_version_ids: toReportField(sseMcpVersionIds),
    mcp_streamable_source_version_ids: toReportField(streamableMcpVersionIds),
    skills_source_version_ids: toReportField(externalSkillVersionIds),
    builtin_tools_source_version_ids: toReportField(builtinToolVersionIds),
  }
}
