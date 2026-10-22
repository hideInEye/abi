import {
  CaretRightOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  GlobalOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Empty, Input, Modal, Segmented, Spin, Tabs, Tag, Tooltip, message } from 'antd'
import type { FC, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import {
  addSkillTag,
  deleteSkill,
  deleteSkillTag,
  deleteSkillVersion,
  downloadSkillFile,
  downloadSkillPackage,
  getSkillDetail,
  getSkillFileList,
  getSkillIntroduction,
  getSkillTagList,
  getSkillVersionDetail,
  getSkillVersionList,
  publishSkillVersion,
  selectSkillVersion,
  updateSkillInfo,
} from '@/service/api/skill'
import { isBuiltinSkill } from './skill-type'

type SkillItem = {
  skillId?: number | string
  id?: number | string
  bizName?: string
  spaceId?: number | string
  spaceName?: string
  summary?: string
  status?: string
  visibility?: string
  latestVersionId?: number | string
  sourceSkillId?: number | string
  createdBy?: string
  createTime?: string
  updateTime?: string
  skillType?: number | string
}

type VersionItem = {
  versionId?: number | string
  id?: number | string
  version?: string
  versionNo?: string
  status?: string
  changelog?: string
  createTime?: string
  publishedAt?: string
  fileCount?: number
  totalSize?: number
}

type FileItem = {
  id?: number | string
  filePath?: string
  path?: string
  name?: string
  fileSize?: number
  size?: number
  contentType?: string
  type?: string
}

type TagItem = {
  tagId?: number | string
  tagName: string
}

type Props = {
  open: boolean
  onClose: () => void
  onDeleted?: () => void
  skill?: SkillItem | null
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i += 1
  }
  return `${size.toFixed(1)} ${units[i]}`
}

/** 格式化时间：去掉 ISO 中的 T，并去掉毫秒/时区后缀 */
function formatDateTime(s?: string) {
  if (!s) return ''
  return String(s)
    .replace('T', ' ')
    .replace(/\.\d+Z?$/, '')
    .replace(/Z$/, '')
}

/** chat 请求拦截器返回响应体 { code, msg, data }，此处统一解包列表 */
function unwrapRows(res: any): any[] {
  const d = res?.data
  const rows = d?.rows || d?.pageItems || d?.data || (Array.isArray(d) ? d : []) || []
  return Array.isArray(rows) ? rows : []
}

function unwrapObject(res: any): any {
  const d = res?.data
  return d?.data || d || {}
}

function isOk(res: any): boolean {
  return Number(res?.code) === 200
}

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

/** blob 接口返回完整 axios 响应，res.data 即 Blob */
function resolveBlob(res: any): Blob | null {
  const payload = res?.data ?? res
  if (payload instanceof Blob) return payload
  return null
}

/** 文件树节点（自定义，不依赖 antd Tree） */
type FbNode = {
  key: string
  title: string
  isLeaf: boolean
  children?: FbNode[]
}

/** 根据 filePath 构建树形结构 */
function buildFileTree(files: FileItem[]): { tree: FbNode[]; map: Record<string, FileItem> } {
  const root: Record<string, any> = {}
  const map: Record<string, FileItem> = {}
  files.forEach((f) => {
    const p = f.filePath || f.path || f.name || ''
    if (!p) return
    map[p] = f
    const parts = p.split('/').filter(Boolean)
    let node: Record<string, any> = root
    parts.forEach((part, idx) => {
      if (!node[part]) {
        node[part] = { __children: {}, __path: parts.slice(0, idx + 1).join('/'), __isLeaf: false }
      }
      if (idx === parts.length - 1) {
        node[part].__isLeaf = true
        node[part].__file = f
      }
      node = node[part].__children
    })
  })

  const toTree = (obj: Record<string, any>): FbNode[] =>
    Object.keys(obj)
      .sort((a, b) => {
        const ax = obj[a].__isLeaf && Object.keys(obj[a].__children).length === 0
        const bx = obj[b].__isLeaf && Object.keys(obj[b].__children).length === 0
        if (ax === bx) return a.localeCompare(b)
        return ax ? 1 : -1
      })
      .map((key) => {
        const val = obj[key]
        const children = toTree(val.__children)
        const isFile = children.length === 0 && val.__isLeaf
        return {
          key: val.__path,
          title: key,
          isLeaf: isFile,
          children: children.length ? children : undefined,
        }
      })

  return { tree: toTree(root), map }
}

/** 自定义文件浏览器：递归平铺渲染，避免 antd Tree 默认样式包裹 */
const FileBrowser: FC<{
  data: FbNode[]
  fileMap: Record<string, FileItem>
  size?: 'sm' | 'md'
  onDownload: (path: string) => void
}> = ({ data, fileMap, onDownload, size = 'md' }) => {
  const [closed, setClosed] = useState<Set<string>>(new Set())

  const toggle = (k: string) => {
    setClosed((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }

  const render = (nodes: FbNode[], depth: number): ReactNode =>
    nodes.map((n) => {
      const indent = 8 + depth * 16
      if (!n.isLeaf) {
        const isOpen = !closed.has(n.key)
        return (
          <div key={n.key}>
            <div className="fb-row fb-row--folder" style={{ paddingLeft: indent }} onClick={() => toggle(n.key)}>
              <CaretRightOutlined className={`fb-caret ${isOpen ? 'fb-caret--open' : ''}`} />
              {isOpen ? <FolderOpenOutlined className="fb-icon-folder" /> : <FolderOutlined className="fb-icon-folder" />}
              <span className="fb-name fb-name--folder">{n.title}</span>
            </div>
            {isOpen && n.children && render(n.children, depth + 1)}
          </div>
        )
      }
      const file = fileMap[n.key]
      return (
        <div className="fb-row fb-row--file" key={n.key} style={{ paddingLeft: indent + 18 }}>
          <FileOutlined className="fb-icon-file" />
          <span className="fb-name">{n.title}</span>
          {file?.fileSize != null && <span className="fb-size">{formatFileSize(file.fileSize)}</span>}
          <Tooltip title="下载">
            <Button
              className="fb-action"
              icon={<DownloadOutlined />}
              size="small"
              type="text"
              onClick={(e) => {
                e.stopPropagation()
                onDownload((file?.filePath || file?.path || n.key) as string)
              }}
            />
          </Tooltip>
        </div>
      )
    })

  return <div className={`file-browser ${size === 'sm' ? 'file-browser--sm' : ''}`}>{render(data, 0)}</div>
}

/** 版本状态三态：离线版本 / 当前启用 / 历史版本 */
function resolveVersionStatus(status?: string, isCurrent?: boolean): { cls: string; label: string } {
  const s = (status || '').toUpperCase()
  if (s === 'DRAFT') return { cls: 'offline', label: '离线版本' }
  if (isCurrent) return { cls: 'active', label: '当前启用' }
  return { cls: 'archived', label: '历史版本' }
}

/** 技能整体状态徽章（详情页顶部） */
function resolveStatusBadge(status?: string) {
  if (!status) return null
  if (status === '1') return { cls: 'sd-badge--active', label: '已发布' }
  if (status === 'HISTORY' || status === 'ARCHIVED') return { cls: 'sd-badge--archived', label: '历史版本' }
  if (status === '0' || status === 'DRAFT') return { cls: 'sd-badge--offline', label: '离线版本' }
  if (status === 'PENDING_REVIEW') return { cls: 'sd-badge--review', label: '审核中' }
  if (status === 'REJECTED') return { cls: 'sd-badge--rejected', label: '已驳回' }
  if (status === 'SCANNING' || status === 'UPLOADED') return { cls: 'sd-badge--scanning', label: '扫描中' }
  return { cls: 'sd-badge--offline', label: '离线版本' }
}

function resolveVisibilityBadge(visibility?: string) {
  if (!visibility) return null
  const v = visibility.toUpperCase()
  if (v === 'PUBLIC') return { cls: 'sd-badge--public', icon: <GlobalOutlined />, label: '公开' }
  if (v === 'PRIVATE') return { cls: 'sd-badge--private', icon: <LockOutlined />, label: '私有' }
  if (v === 'NAMESPACE_ONLY') return { cls: 'sd-badge--ns', icon: <UserOutlined />, label: '空间内' }
  return null
}

// 解析 SKILL.md 顶部的 YAML frontmatter，拆出 name / description 与正文，
// 避免整段 frontmatter 被 react-markdown 当成加粗大标题渲染
function parseSkillIntro(md: string): { name: string; description: string; body: string } {
  if (typeof md !== 'string' || !md) return { name: '', description: '', body: '' }
  const text = md.replace(/^\uFEFF/, '')
  const match = text.match(/^\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)
  if (!match) return { name: '', description: '', body: md }
  const body = text.slice(match[0].length).replace(/^\s*\n/, '')
  const lines = match[1].split(/\r?\n/)
  let name = ''
  let description = ''
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([A-Za-z0-9_-]+)[ \t]*:[ \t]*(.*)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    let val = m[2].trim()
    if (/^[|>][-+]?$/.test(val)) {
      const collected: string[] = []
      let j = i + 1
      for (; j < lines.length; j++) {
        if (/^[ \t]+\S/.test(lines[j])) collected.push(lines[j].replace(/^[ \t]+/, ''))
        else if (lines[j].trim() === '') collected.push('')
        else break
      }
      i = j - 1
      val = collected.join(val[0] === '>' ? ' ' : '\n').trim()
    } else {
      val = val.replace(/^["']|["']$/g, '')
    }
    if (key === 'name') name = val
    else if (key === 'description') description = val
  }
  if (!name && !description) return { name: '', description: '', body: md }
  return { name, description, body }
}

const SkillDetailDrawer: FC<Props> = ({ onClose, onDeleted, open, skill }) => {
  const [detail, setDetail] = useState<SkillItem | null>(null)
  const [versions, setVersions] = useState<VersionItem[]>([])
  const [activeVersionId, setActiveVersionId] = useState<number | string | undefined>(undefined)
  const [files, setFiles] = useState<FileItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [newTag, setNewTag] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [publishingVid, setPublishingVid] = useState<number | string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [addingTag, setAddingTag] = useState(false)
  const [fileBrowserOpen, setFileBrowserOpen] = useState(true)
  const [introduction, setIntroduction] = useState('')
  const [loadingIntro, setLoadingIntro] = useState(false)
  // 可见范围（公开/私有），从技能详情同步，可即时修改并持久化
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PRIVATE')
  const [savingVisibility, setSavingVisibility] = useState(false)

  // 左侧（固定默认版本）的独立状态
  const [leftFiles, setLeftFiles] = useState<FileItem[]>([])
  const [leftVersionDetail, setLeftVersionDetail] = useState<any>(null)
  const [loadingLeftFiles, setLoadingLeftFiles] = useState(false)
  const [loadingLeftVersionDetail, setLoadingLeftVersionDetail] = useState(false)

  const src: any = detail || skill || {}
  // 内置技能为系统基本能力：详情页只读，隐藏版本发布/回滚/删除、标签管理、可见范围与删除技能
  const isBuiltin = isBuiltinSkill(src.skillType)
  const skillId = skill?.id ?? skill?.skillId
  const skillName = src.bizName
  const namespace = src.spaceId
  const summary = src.summary
  const ownerName = src.createdBy
  const statusBadge = resolveStatusBadge(src.status)
  const visibilityBadge = resolveVisibilityBadge(src.visibility)
  const activeVersion = versions.find((v) => String(v.versionId ?? v.id) === String(activeVersionId))
  // 当前启用版本：优先回滚显式选中的 sourceSkillId；发布只更新 latestVersionId，需兜底，否则发布后全部显示历史版本
  const headlineVersionId = src.sourceSkillId || src.latestVersionId || skill?.latestVersionId
  const headlineVersion = headlineVersionId ? versions.find((v) => String(v.versionId ?? v.id) === String(headlineVersionId)) : undefined

  const { tree: fileTree, map: fileMap } = useMemo(() => buildFileTree(files), [files])
  const { tree: leftFileTree, map: leftFileMap } = useMemo(() => buildFileTree(leftFiles), [leftFiles])
  const introFm = useMemo(() => parseSkillIntro(introduction), [introduction])

  async function loadDetail() {
    if (!skillId) return null
    setLoadingDetail(true)
    try {
      const res: any = await getSkillDetail({ skillId })
      const d = unwrapObject(res)
      if (d && Object.keys(d).length) setDetail(d)
      return d
    } catch {
      return null
    } finally {
      setLoadingDetail(false)
    }
  }

  async function loadIntroduction() {
    if (!skillId) return
    setLoadingIntro(true)
    try {
      const res: any = await getSkillIntroduction({ skillId })
      const md = res?.data?.data ?? res?.data ?? ''
      setIntroduction(typeof md === 'string' ? md : '')
    } catch {
      setIntroduction('')
    } finally {
      setLoadingIntro(false)
    }
  }

  function mapFile(r: any): FileItem {
    if (typeof r === 'string') return { filePath: r, name: r.split('/').pop() }
    return {
      contentType: r.contentType,
      fileSize: r.fileSize ?? r.size,
      filePath: r.filePath ?? r.path ?? r.name,
      id: r.id,
      name: r.name || (r.filePath || r.path || '').split('/').pop(),
    }
  }

  async function loadLeftFiles(vid: number | string): Promise<FileItem[]> {
    setLoadingLeftFiles(true)
    try {
      const res: any = await getSkillFileList({ versionId: vid })
      const mapped = unwrapRows(res).map(mapFile)
      setLeftFiles(mapped)
      return mapped
    } catch {
      setLeftFiles([])
      return []
    } finally {
      setLoadingLeftFiles(false)
    }
  }

  async function loadLeftVersionDetail(vid: number | string): Promise<any> {
    setLoadingLeftVersionDetail(true)
    try {
      const res: any = await getSkillVersionDetail({ versionId: vid })
      const d = unwrapObject(res)
      setLeftVersionDetail(d)
      return d
    } catch {
      setLeftVersionDetail(null)
      return null
    } finally {
      setLoadingLeftVersionDetail(false)
    }
  }

  async function loadVersions(sourceSkillId?: number | string | null, autoSelect = true) {
    if (!skillId) return
    setLoadingVersions(true)
    try {
      const res: any = await getSkillVersionList({ skillId })
      const list = unwrapRows(res)
      setVersions(list)
      if (autoSelect && list.length) {
        const firstId = sourceSkillId || list[0].versionId || list[0].id
        setActiveVersionId(firstId)
        loadLeftVersionDetail(firstId)
        loadLeftFiles(firstId).then((l) => setFiles(l))
      }
    } catch {
      setVersions([])
    } finally {
      setLoadingVersions(false)
    }
  }

  async function loadTags() {
    if (!skillId) return
    try {
      const res: any = await getSkillTagList({ skillId })
      const list = unwrapRows(res)
      setTags(
        list.map((r: any) => ({
          tagId: r.tagId ?? r.id,
          tagName: r.tagName ?? r.name ?? String(r),
        })),
      )
    } catch {
      setTags([])
    }
  }

  async function loadFiles(vid: number | string) {
    try {
      const res: any = await getSkillFileList({ versionId: vid })
      setFiles(unwrapRows(res).map(mapFile))
    } catch {
      setFiles([])
    }
  }

  useEffect(() => {
    if (open && skillId) {
      setActiveVersionId(undefined)
      setDetail(null)
      setIntroduction('')
      setVersions([])
      ;(async () => {
        const d = await loadDetail()
        loadVersions(d?.sourceSkillId)
        loadIntroduction()
        loadTags()
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, skillId])

  // 从技能详情/列表数据同步可见范围（后端未返回时默认私有）
  useEffect(() => {
    const v = String(detail?.visibility ?? skill?.visibility ?? '').toUpperCase()
    setVisibility(v === 'PUBLIC' ? 'PUBLIC' : 'PRIVATE')
  }, [detail, skill])

  async function handleDownloadPackage() {
    if (!skillId) return
    setDownloading(true)
    try {
      const res: any = await downloadSkillPackage({ skillId })
      const blob = resolveBlob(res)
      if (!blob) {
        message.error('下载失败')
        return
      }
      triggerDownload(blob, `${skillName || 'skill'}.zip`)
      message.success('开始下载')
    } catch (err: any) {
      message.error(err?.message || '下载失败')
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownloadFile(path: string) {
    if (!activeVersionId || !path) return
    try {
      const res: any = await downloadSkillFile({ path, versionId: activeVersionId })
      const blob = resolveBlob(res)
      if (!blob) {
        message.error('下载失败')
        return
      }
      triggerDownload(blob, path.split('/').pop() || 'file')
    } catch (err: any) {
      message.error(err?.message || '下载失败')
    }
  }

  function handlePublishVersion(v: VersionItem) {
    const vid = v.versionId ?? v.id
    if (!vid) return
    Modal.confirm({
      title: '确认发布该版本？',
      content: `版本 v${v.version || v.versionNo || vid} 将被设为最新版本，发布后会更新技能的 latestVersionId。`,
      okText: '发布',
      cancelText: '取消',
      onOk: async () => {
        setPublishingVid(vid)
        try {
          const res: any = await publishSkillVersion({ versionId: vid })
          if (isOk(res)) {
            message.success('发布成功')
            loadVersions(undefined, false)
            loadDetail()
            if (activeVersionId != null) {
              loadLeftVersionDetail(activeVersionId)
              loadLeftFiles(activeVersionId)
            }
          }
        } catch (err: any) {
          message.error(err?.message || '发布失败')
        } finally {
          setPublishingVid(null)
        }
      },
    })
  }

  // 切换版本查看（仅右侧变化）
  function handleVersionClick(vid: number | string) {
    setActiveVersionId(vid)
    loadFiles(vid)
  }

  // 回滚版本（左右两侧都刷新）
  function handleSetCurrentVersion(v: VersionItem) {
    const vid = v.versionId ?? v.id
    if (!vid || !skillId) return
    Modal.confirm({
      title: '确定回滚？',
      content: `将回滚至 v${v.version || v.versionNo || vid} 版本。`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res: any = await selectSkillVersion({ skillId, versionId: vid })
          if (isOk(res)) {
            message.success('回滚成功')
            setActiveVersionId(vid)
            loadFiles(vid)
            loadLeftVersionDetail(vid)
            loadLeftFiles(vid)
            loadVersions(undefined, false)
            loadDetail()
          }
        } catch (err: any) {
          message.error(err?.message || '操作失败')
        }
      },
    })
  }

  // 删除版本
  function handleDeleteVersion(v: VersionItem) {
    const vid = v.versionId ?? v.id
    if (!vid) return
    Modal.confirm({
      title: '删除该版本？',
      content: `将删除版本 v${v.version || v.versionNo || vid}，删除后不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const res: any = await deleteSkillVersion({ versionId: vid })
          if (isOk(res)) {
            message.success('删除成功')
            loadVersions(undefined, false)
            loadDetail()
          }
        } catch (err: any) {
          message.error(err?.message || '删除失败')
        }
      },
    })
  }

  async function handleAddTag() {
    const t = newTag.trim()
    if (!skillId || !t) return
    setAddingTag(true)
    try {
      const res: any = await addSkillTag({ skillId, tagName: t })
      if (isOk(res)) {
        message.success('添加成功')
        setNewTag('')
        loadTags()
      }
    } catch (err: any) {
      message.error(err?.message || '添加失败')
    } finally {
      setAddingTag(false)
    }
  }

  async function handleDeleteTag(t: TagItem) {
    if (t.tagId == null) return
    try {
      const res: any = await deleteSkillTag({ tagId: t.tagId })
      if (isOk(res)) {
        message.success('删除成功')
        loadTags()
      }
    } catch (err: any) {
      message.error(err?.message || '删除失败')
    }
  }

  // 修改可见范围（乐观更新 + 失败回滚），仅提交 visibility 走后端部分更新
  async function handleVisibilityChange(next: 'PUBLIC' | 'PRIVATE') {
    if (!skillId || next === visibility || savingVisibility) return
    const prev = visibility
    setVisibility(next)
    setSavingVisibility(true)
    try {
      const res: any = await updateSkillInfo({ skillId, visibility: next })
      if (isOk(res)) {
        message.success(next === 'PUBLIC' ? '已设为公开' : '已设为私有')
        loadDetail()
      } else {
        // 失败文案由请求层统一透传后端 msg，这里只回滚状态
        setVisibility(prev)
      }
    } catch {
      setVisibility(prev)
    } finally {
      setSavingVisibility(false)
    }
  }

  function handleDeleteSkill() {
    if (!skillId) return
    Modal.confirm({
      title: '确认删除该技能？',
      content: `技能 「${skillName}」 删除后不可恢复，所有版本和文件均会一并删除。`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        const res: any = await deleteSkill({ skillId })
        if (isOk(res)) {
          message.success('删除成功')
          onDeleted?.()
        }
      },
    })
  }

  return (
    <Drawer
      destroyOnClose
      open={open}
      rootClassName="skill-hub-scope"
      className="sd-v5-drawer"
      title={null}
      closable={false}
      width={1200}
      onClose={onClose}
    >
      <Spin spinning={loadingDetail && !detail}>
        {/* 顶部 Hero 区 — 渐变背景 + 毛玻璃 */}
        <div className="sd-v5-hero">

          <div className="sd-v5-hero__inner">
            <div className="sd-v5-hero__head">
              <div className="sd-v5-hero__icon">
                <RocketOutlined />
              </div>
              <div className="sd-v5-hero__meta">
                <div className="sd-v5-hero__title">{skillName}</div>
                <div className="sd-v5-hero__sub">
                  {ownerName && (
                    <span className="sd-v5-hero__author">
                      <UserOutlined /> {ownerName}
                    </span>
                  )}
                  {namespace && <span className="sd-v5-hero__ns">@{String(namespace).replace(/^@/, '')}</span>}
                </div>
              </div>
              <div className="sd-v5-hero__badges">
                {isBuiltin && <span className="sd-v5-pill sd-v5-pill--ns">系统</span>}
                {statusBadge && (
                  <span
                    className={`sd-v5-pill sd-v5-pill--${statusBadge.cls.includes('active') ? 'active' : statusBadge.cls.includes('hidden') ? 'hidden' : statusBadge.cls.includes('review') ? 'review' : statusBadge.cls.includes('rejected') ? 'rejected' : 'default'}`}
                  >
                    {statusBadge.label}
                  </span>
                )}
                {visibilityBadge && (
                  <span className="sd-v5-pill sd-v5-pill--ns">
                    {visibilityBadge.icon} {visibilityBadge.label}
                  </span>
                )}
              </div>
            </div>
            {summary && <div className="sd-v5-hero__desc">{summary}</div>}
            {/* 统计数字条 */}
            <div className="sd-v5-stats">
              <div className="sd-v5-stat">
                <span className="sd-v5-stat__val">{versions.length}</span>
                <span className="sd-v5-stat__lbl">版本</span>
              </div>
              <div className="sd-v5-stat">
                <span className="sd-v5-stat__val">{leftFiles.length}</span>
                <span className="sd-v5-stat__lbl">文件</span>
              </div>
              <div className="sd-v5-stat">
                <span className="sd-v5-stat__val">{tags.length}</span>
                <span className="sd-v5-stat__lbl">标签</span>
              </div>
              {headlineVersion && (
                <div className="sd-v5-stat">
                  <span className="sd-v5-stat__val sd-v5-stat__val--accent">v{headlineVersion.version || headlineVersion.versionNo}</span>
                  <span className="sd-v5-stat__lbl">当前版本</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 主体两栏 */}
        <div className="sd-v5-body">
          {/* 左主栏 */}
          <div className="sd-v5-main">
            <Tabs
              defaultActiveKey="overview"
              className="sd-v5-tabs"
              items={[
                {
                  key: 'overview',
                  label: '概览',
                  children: (
                    <Spin spinning={loadingIntro || loadingLeftVersionDetail}>
                      <div className="sd-v5-panel">
                        {introduction ? (
                          <div className="skill-intro-md sd-v5-md">
                            {(introFm.name || introFm.description) && (
                              <div className="skill-intro-head">
                                {introFm.name && (
                                  <div className="skill-intro-head__name">
                                    <span className="skill-intro-head__label">name:</span> {introFm.name}
                                  </div>
                                )}
                                {introFm.description && (
                                  <div className="skill-intro-head__desc">
                                    <span className="skill-intro-head__label">description:</span> {introFm.description}
                                  </div>
                                )}
                              </div>
                            )}
                            <ReactMarkdown>{introFm.body}</ReactMarkdown>
                          </div>
                        ) : (
                          <>
                            <div className="sd-v5-section-head">
                              <span className="sd-v5-section-title">版本说明</span>
                              {headlineVersion && <span className="sd-v5-chip">v{headlineVersion.version || headlineVersion.versionNo}</span>}
                            </div>
                            <div className="sd-v5-text">{leftVersionDetail?.changelog || headlineVersion?.changelog || '暂无版本说明'}</div>
                          </>
                        )}

                        {(leftVersionDetail?.readme || leftVersionDetail?.description) && (
                          <>
                            <div className="sd-v5-divider" />
                            <div className="sd-v5-section-head">
                              <span className="sd-v5-section-title">README</span>
                            </div>
                            <div className="sd-v5-text sd-v5-text--muted">{leftVersionDetail.readme || leftVersionDetail.description}</div>
                          </>
                        )}

                        {leftVersionDetail?.manifestJson && (
                          <>
                            <div className="sd-v5-divider" />
                            <div className="sd-v5-section-head">
                              <span className="sd-v5-section-title">Manifest</span>
                            </div>
                            <pre className="sd-v5-code">
                              {typeof leftVersionDetail.manifestJson === 'string' ? leftVersionDetail.manifestJson : JSON.stringify(leftVersionDetail.manifestJson, null, 2)}
                            </pre>
                          </>
                        )}
                      </div>
                    </Spin>
                  ),
                },
                {
                  key: 'files',
                  label: `文件（${leftFiles.length}）`,
                  children: (
                    <Spin spinning={loadingLeftFiles}>
                      {leftFiles.length === 0 && !loadingLeftFiles ? (
                        <div className="sd-v5-empty">
                          <Empty description="暂无文件" />
                        </div>
                      ) : (
                        <div className="sd-v5-panel sd-v5-file-tree">
                          <FileBrowser data={leftFileTree} fileMap={leftFileMap} onDownload={handleDownloadFile} />
                        </div>
                      )}
                    </Spin>
                  ),
                },
                {
                  key: 'versions',
                  label: `版本（${versions.length}）`,
                  children: (
                    <Spin spinning={loadingVersions}>
                      {versions.length === 0 && !loadingVersions ? (
                        <div className="sd-v5-empty">
                          <Empty description="暂无版本" />
                        </div>
                      ) : (
                        <div className="sd-v5-version-list">
                          {versions.map((v) => {
                            const vid = v.versionId ?? v.id
                            const isActive = String(vid) === String(activeVersionId)
                            const isHeadline = headlineVersion && String(headlineVersion.versionId ?? headlineVersion.id) === String(vid)
                            const vStatus = resolveVersionStatus(v.status, !!isHeadline)
                            return (
                              <div className={`sd-v5-ver ${isActive ? 'sd-v5-ver--active' : ''}`} key={vid} onClick={() => vid != null && handleVersionClick(vid)}>
                                <div className="sd-v5-ver__head">
                                  <div className="sd-v5-ver__left">
                                    <span className="sd-v5-chip">v{v.version || v.versionNo || vid}</span>
                                    <span className={`sd-v5-pill sd-v5-pill--${vStatus.cls}`}>
                                      {vStatus.label}
                                    </span>
                                    {isHeadline && <span className="sd-v5-pill sd-v5-pill--current">当前版本</span>}
                                  </div>
                                  <div className="sd-v5-ver__actions" onClick={(e) => e.stopPropagation()}>
                                    <span className="sd-v5-ver__time">{formatDateTime(v.publishedAt || v.createTime)}</span>
                                    {/* 内置技能版本由系统托管，不提供发布/回滚/删除 */}
                                    {!isBuiltin && vStatus.cls === 'offline' && (
                                      <Button className="sd-v5-btn sd-v5-btn--primary" loading={publishingVid === vid} onClick={() => handlePublishVersion(v)}>
                                        发布
                                      </Button>
                                    )}
                                    {/* 回滚按钮只对“非当前启用版本”显示，与查看选中态（点击卡片）无关 */}
                                    {!isBuiltin && vStatus.cls !== 'offline' && !isHeadline && (
                                      <Button className="sd-v5-btn sd-v5-btn--primary" onClick={() => handleSetCurrentVersion(v)}>
                                        回滚
                                      </Button>
                                    )}
                                    {/* 当前启用版本不提供删除；删除按钮为纯文字白底红字 */}
                                    {!isBuiltin && !isHeadline && (
                                      <Button className="sd-v5-btn sd-v5-btn--danger" onClick={() => handleDeleteVersion(v)}>
                                        删除
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {v.changelog && <div className="sd-v5-ver__desc">{v.changelog}</div>}
                                <div className="sd-v5-ver__footer">
                                  {v.fileCount != null && <span>{v.fileCount} 个文件</span>}
                                  {v.totalSize != null && <span>{formatFileSize(v.totalSize)}</span>}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </Spin>
                  ),
                },
              ]}
            />
          </div>

          {/* 右侧栏 */}
          <aside className="sd-v5-side">
            {/* 下载 */}
            <div className="sd-v5-card">
              <div className="sd-v5-card__title">
                <CloudDownloadOutlined /> 下载技能包
              </div>
              <Button block className="sd-v5-btn sd-v5-btn--gradient" loading={downloading} size="large" icon={<CloudDownloadOutlined />} onClick={handleDownloadPackage}>
                下载 ZIP
              </Button>
            </div>

            {/* 文件浏览 */}
            {files.length > 0 && (
              <div className="sd-v5-card">
                <button className="sd-v5-card__toggle" type="button" onClick={() => setFileBrowserOpen((v) => !v)}>
                  <FolderOutlined className="sd-v5-card__icon" />
                  <span className="sd-v5-card__title-text">文件浏览</span>
                  <span className="sd-v5-card__count">{files.length}</span>
                  <DownOutlined className={`sd-v5-caret ${fileBrowserOpen ? 'sd-v5-caret--open' : ''}`} />
                </button>
                {fileBrowserOpen && (
                  <>
                    {activeVersion && (
                      <div className="sd-v5-card__ver-info">
                        <span className="sd-v5-chip sd-v5-chip--sm">v{activeVersion.version || activeVersion.versionNo}</span>
                        {activeVersion.fileCount != null && <span className="sd-v5-muted">{activeVersion.fileCount} 文件</span>}
                      </div>
                    )}
                    <div className="sd-v5-card__file-scroll">
                      <FileBrowser data={fileTree} fileMap={fileMap} size="sm" onDownload={handleDownloadFile} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 版本信息 */}
            <div className="sd-v5-card">
              <div className="sd-v5-card__title">版本信息</div>
              <div className="sd-v5-info-rows">
                <div className="sd-v5-info-row">
                  <span className="sd-v5-info-row__label">公开版本</span>
                  <span className="sd-v5-info-row__val">{headlineVersion ? `v${headlineVersion.version || headlineVersion.versionNo}` : '—'}</span>
                </div>
                <div className="sd-v5-info-row">
                  <span className="sd-v5-info-row__label">命名空间</span>
                  <span className="sd-v5-info-row__val sd-v5-info-row__val--mono">@{String(namespace ?? '-').replace(/^@/, '')}</span>
                </div>
                {src.createTime && (
                  <div className="sd-v5-info-row">
                    <span className="sd-v5-info-row__label">创建时间</span>
                    <span className="sd-v5-info-row__val">{formatDateTime(src.createTime)}</span>
                  </div>
                )}
                {src.updateTime && (
                  <div className="sd-v5-info-row">
                    <span className="sd-v5-info-row__label">更新时间</span>
                    <span className="sd-v5-info-row__val">{formatDateTime(src.updateTime)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 标签管理（内置技能由系统托管，不提供标签编辑） */}
            {!isBuiltin && (
            <div className="sd-v5-card">
              <div className="sd-v5-card__title">
                <TagOutlined /> 标签管理
              </div>
              <div className="sd-v5-tag-input-row">
                <Input placeholder="输入标签名" size="small" value={newTag} onChange={(e) => setNewTag(e.target.value)} onPressEnter={handleAddTag} className="sd-v5-input" />
                <Button className="sd-v5-btn sd-v5-btn--primary" icon={<PlusOutlined />} loading={addingTag} size="small" onClick={handleAddTag} />
              </div>
              {tags.length === 0 ? (
                <div className="sd-v5-muted">暂无标签</div>
              ) : (
                <div className="sd-v5-tag-list">
                  {tags.map((t) => (
                    <Tag
                      closable
                      closeIcon={<DeleteOutlined />}
                      key={t.tagId ?? t.tagName}
                      className="sd-v5-tag"
                      onClose={(e) => {
                        e.preventDefault()
                        handleDeleteTag(t)
                      }}
                    >
                      {t.tagName}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* 可见范围（内置技能可见性由系统决定，不提供切换） */}
            {!isBuiltin && (
            <div className="sd-v5-card">
              <div className="sd-v5-card__title">
                <EyeOutlined /> 可见范围
              </div>
              <Segmented
                block
                disabled={savingVisibility}
                onChange={(val) => handleVisibilityChange(val as 'PUBLIC' | 'PRIVATE')}
                options={[
                  { icon: <GlobalOutlined />, label: '公开', value: 'PUBLIC' },
                  { icon: <LockOutlined />, label: '私有', value: 'PRIVATE' },
                ]}
                value={visibility}
              />
              <div className="sd-v5-muted" style={{ marginTop: 8 }}>
                {visibility === 'PUBLIC'
                  ? '所有空间成员均可检索并使用该技能。'
                  : '仅所属空间可见，其他空间无法检索和使用。'}
              </div>
            </div>
            )}

            {/* 生命周期管理（内置技能不可删除） */}
            {!isBuiltin && (
            <div className="sd-v5-card sd-v5-card--danger">
              <div className="sd-v5-card__title sd-v5-card__title--danger">
                <ReloadOutlined /> 生命周期管理
              </div>
              <div className="sd-v5-muted">删除后不可恢复，所有版本和文件均会一并删除。</div>
              <div className="sd-v5-info-rows" style={{ marginTop: 8 }}>
                <div className="sd-v5-info-row">
                  <span className="sd-v5-info-row__label">当前公开版本</span>
                  <span className="sd-v5-info-row__val">{headlineVersion ? `v${headlineVersion.version || headlineVersion.versionNo}` : '暂无'}</span>
                </div>
              </div>
              <Button danger block className="sd-v5-btn sd-v5-btn--danger-fill" style={{ marginTop: 12 }} type="primary" onClick={handleDeleteSkill}>
                删除技能
              </Button>
            </div>
            )}
          </aside>
        </div>
      </Spin>
    </Drawer>
  )
}

export default SkillDetailDrawer
