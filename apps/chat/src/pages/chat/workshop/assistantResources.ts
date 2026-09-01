import { fetchAssistantDetail } from '../../../service/api/assistant'

/** 助手绑定的数据语义叶子，用于限制输入框数据语义弹窗候选 */
export interface AssistantBoundSemantic {
  /** 与详情抽屉一致的前缀 id（schema_<真实id>） */
  id: string
  schemaId: number | string
  name: string
  /** 数据语义所属分组路径（形如「父组 / 子组」） */
  groupName: string
}

/** 助手绑定的技能；id 即源版本 id，探索/报告提交可直接使用 */
export interface AssistantBoundSkill {
  id: string
  bizName: string
  latestVersionId: string
  /** 助手绑定的技能按外部技能（1）归入报告源字段 */
  skillType: string
}

/** 助手绑定的 MCP 服务；id 即源版本 id，protocol 决定 sse/streamable 归属 */
export interface AssistantBoundMcp {
  id: string
  name: string
  protocol: 'sse' | 'streamable'
}

/** 助手绑定资源全集：数据语义 / 技能 / MCP */
export interface AssistantBoundResources {
  appId: string
  appName: string
  /** 开场引导（version.prologue，欢迎页文案用） */
  prologue: string
  /** 助手描述（prologue 缺失时的欢迎页兜底文案） */
  description: string
  semantics: AssistantBoundSemantic[]
  skills: AssistantBoundSkill[]
  mcps: AssistantBoundMcp[]
}

/**
 * 把助手详情（app/get 响应）映射为绑定资源。
 * 版本选取与详情抽屉一致：优先 latestVersionId 对应版本，回退首个版本，再回退详情自身。
 */
export function mapAssistantBoundResources(detail: any, fallbackAppId?: number | string): AssistantBoundResources {
  const safe: any = detail && typeof detail === 'object' ? detail : {}
  const versions: any[] = Array.isArray(safe.versions) ? safe.versions : []
  const version: any =
    versions.find((v: any) => v?.versionId != null && String(v.versionId) === String(safe.latestVersionId)) ||
    versions[0] ||
    safe

  const semantics: AssistantBoundSemantic[] = []
  const schemaSemantics: any[] = Array.isArray(version?.schemaSemantics) ? version.schemaSemantics : []
  schemaSemantics.forEach((s: any) => {
    const cfg: any[] = Array.isArray(s?.schemaConfig) ? s.schemaConfig : []
    cfg.forEach((c: any) => {
      if (c?.id == null) return
      semantics.push({
        id: `schema_${c.id}`,
        schemaId: c.id,
        name: c.name || '',
        groupName: c.groupPath || '',
      })
    })
  })

  const skills: AssistantBoundSkill[] = []
  const skillGroups: any[] = Array.isArray(version?.skills) ? version.skills : []
  skillGroups.forEach((s: any) => {
    const cfg: any[] = Array.isArray(s?.skillConfig) ? s.skillConfig : []
    cfg.forEach((c: any) => {
      if (c?.id == null) return
      skills.push({
        id: String(c.id),
        bizName: c.name || '',
        latestVersionId: String(c.id),
        skillType: '1',
      })
    })
  })

  const mcps: AssistantBoundMcp[] = []
  const tools: any[] = Array.isArray(version?.tools) ? version.tools : []
  tools.forEach((t: any) => {
    // toolType：'1' 内置工具 / '2' MCP，仅 MCP 进入输入框 MCP 候选
    if (String(t?.toolType) !== '2') return
    const cfg: any[] = Array.isArray(t?.toolConfig) ? t.toolConfig : []
    cfg.forEach((c: any) => {
      if (c?.id == null) return
      // 详情接口原样返回 mcp_sse/mcp_streamable（真实 groupId 列表），非空即对应协议
      const sse: any[] = Array.isArray(c.mcp_sse) ? c.mcp_sse : []
      mcps.push({
        id: String(c.id),
        name: c.name || '',
        protocol: sse.length > 0 ? 'sse' : 'streamable',
      })
    })
  })

  return {
    appId: String(safe.appId ?? fallbackAppId ?? ''),
    appName: safe.appName || '',
    prologue: version?.prologue || safe.prologue || '',
    description: safe.description || '',
    semantics,
    skills,
    mcps,
  }
}

/**
 * 把绑定语义构造为输入框数据语义弹窗可用的树（扁平叶子列表）。
 * 助手上下文没有真实分组 id，故不做可选分组节点，仅 schema 叶子可选中，
 * 保证提交时只携带 schemaId（与 filterSemanticTree/renderSemNode 的叶子分支兼容）。
 */
export function buildBoundSemanticTree(semantics: AssistantBoundSemantic[]): any[] {
  return semantics.map((s) => ({
    id: s.id,
    type: 'schema',
    schemaId: s.schemaId,
    name: s.name,
    groupName: s.groupName,
  }))
}

/** 拉取助手详情并映射为绑定资源；失败返回 null 由调用方降级为不限制。 */
export async function fetchAssistantBoundResources(appId: number | string): Promise<AssistantBoundResources | null> {
  try {
    const res: any = await fetchAssistantDetail({ appId })
    const d = res?.data
    const detail = d?.data || d || {}
    return mapAssistantBoundResources(detail, appId)
  } catch {
    return null
  }
}
