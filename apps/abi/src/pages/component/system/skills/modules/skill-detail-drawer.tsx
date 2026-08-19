import {
  CaretRightOutlined,
  CloseOutlined,
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
  SwapOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { App, Button, Empty, Input, Segmented, Spin, Tabs, Tag, Tooltip } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import type { FC, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'

import {
  addSkillTagApi,
  deleteSkillApi,
  deleteSkillTagApi,
  deleteSkillVersionApi,
  downloadSkillFileApi,
  downloadSkillPackageApi,
  getSkillDetailApi,
  getSkillFileListApi,
  getSkillIntroductionApi,
  getSkillTagListApi,
  getSkillVersionDetailApi,
  getSkillVersionListApi,
  publishSkillVersionApi,
  selectSkillVersionApi,
  updateSkillInfoApi,
} from '@/service/api/skill'

import '../skill.css'

type SkillItem = {
  skillId?: number | string
  id?: number | string
  skillName?: string
  displayName?: string
  name?: string
  title?: string
  namespace?: string
  namespaceSlug?: string
  spaceName?: string
  summary?: string
  description?: string
  status?: string
  visibility?: string
  latestVersion?: string
  version?: string
  latestVersionId?: number | string
  downloadCount?: number
  downloads?: number
  starCount?: number
  ratingAvg?: number
  ratingCount?: number
  ownerDisplayName?: string
  ownerName?: string
  createdBy?: string
  createTime?: string
  updateTime?: string
  publishedAt?: string
  labels?: any[]
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

function unwrapRows(res: any): any[] {
  const rows = res?.response?.data?.data?.rows || res?.response?.data?.data || res?.response?.data?.rows || res?.data?.rows || res?.data?.data || res?.data || []
  return Array.isArray(rows) ? rows : []
}

function unwrapObject(res: any): any {
  return res?.response?.data?.data || res?.data?.data || res?.data || {}
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

function resolveBlob(res: any): Blob | null {
  const payload = res?.response?.data ?? res?.data ?? res
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

function resolveStatusBadge(status?: string) {
  if (!status) return null
  const s = status.toUpperCase()
  if (s === 'ACTIVE' || s === 'PUBLISHED' || s === '1') return { cls: 'sd-badge--active', label: '已发布' }
  if (s === 'ARCHIVED') return { cls: 'sd-badge--archived', label: '已归档' }
  if (s === 'HIDDEN' || s === '0') return { cls: 'sd-badge--hidden', label: '已隐藏' }
  if (s === 'PENDING_REVIEW') return { cls: 'sd-badge--review', label: '审核中' }
  if (s === 'REJECTED') return { cls: 'sd-badge--rejected', label: '已驳回' }
  if (s === 'SCANNING' || s === 'UPLOADED') return { cls: 'sd-badge--scanning', label: '扫描中' }
  if (s === 'DRAFT') return { cls: 'sd-badge--hidden', label: '草稿' }
  return { cls: 'sd-badge--archived', label: status }
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
  const { message, modal } = App.useApp()

  const [detail, setDetail] = useState<SkillItem | null>(null)
  const [versions, setVersions] = useState<VersionItem[]>([])
  const [activeVersionId, setActiveVersionId] = useState<number | string | undefined>(undefined)
  const [versionDetail, setVersionDetail] = useState<any>(null)
  const [files, setFiles] = useState<FileItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [newTag, setNewTag] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingVersions, setLoadingVersions] = useState(false)
  const [loadingVersionDetail, setLoadingVersionDetail] = useState(false)
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loadingTags, setLoadingTags] = useState(false)
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
  const skillId = skill?.id
  const skillName = src.bizName
  const namespace = src.spaceId
  const summary = src.summary
  const ownerName = src.createdBy
  const downloads = 0
  const statusBadge = resolveStatusBadge(src.status)
  const visibilityBadge = resolveVisibilityBadge(src.visibility)
  const activeVersion = versions.find((v) => String(v.versionId ?? v.id) === String(activeVersionId))
  const headlineVersionId = src.sourceSkillId
  const headlineVersion = versions.find((v) => String(v.versionId ?? v.id) === String(headlineVersionId)) || versions[0]

  const { tree: fileTree, map: fileMap } = useMemo(() => buildFileTree(files), [files])
  const { tree: leftFileTree, map: leftFileMap } = useMemo(() => buildFileTree(leftFiles), [leftFiles])
  const introFm = useMemo(() => parseSkillIntro(introduction), [introduction])

  async function loadDetail() {
    if (!skillId) return null
    setLoadingDetail(true)
    try {
      const res: any = await getSkillDetailApi({ skillId })
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
      const res: any = await getSkillIntroductionApi({ skillId })
      const md = res?.response?.data?.data || res?.data?.data || res?.data || ''
      setIntroduction(typeof md === 'string' ? md : '')
    } catch {
      setIntroduction('')
    } finally {
      setLoadingIntro(false)
    }
  }

  async function loadLeftFiles(vid: number | string): Promise<FileItem[]> {
    setLoadingLeftFiles(true)
    try {
      const res: any = await getSkillFileListApi({ versionId: vid })
      const list = unwrapRows(res)
      const mapped = list.map((r: any) => {
        if (typeof r === 'string') return { filePath: r, name: r.split('/').pop() }
        return {
          contentType: r.contentType,
          fileSize: r.fileSize ?? r.size,
          filePath: r.filePath ?? r.path ?? r.name,
          id: r.id,
          name: r.name || (r.filePath || r.path || '').split('/').pop(),
        }
      })
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
      const res: any = await getSkillVersionDetailApi({ versionId: vid })
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
      const res: any = await getSkillVersionListApi({ skillId })
      const list = unwrapRows(res)
      setVersions(list)
      if (autoSelect && list.length) {
        const firstId = sourceSkillId || list[0].versionId || list[0].id
        setActiveVersionId(firstId)
        // 加载左侧（固定默认版本），初始加载时右侧复用左侧数据避免重复请求
        loadLeftVersionDetail(firstId).then((d) => {
          setVersionDetail(d)
        })
        loadLeftFiles(firstId).then((list) => {
          setFiles(list)
        })
      }
    } catch {
      setVersions([])
    } finally {
      setLoadingVersions(false)
    }
  }

  async function loadTags() {
    if (!skillId) return
    setLoadingTags(true)
    try {
      const res: any = await getSkillTagListApi({ skillId })
      const list = unwrapRows(res)
      setTags(
        list.map((r: any) => ({
          tagId: r.tagId ?? r.id,
          tagName: r.tagName ?? r.name ?? String(r),
        })),
      )
    } catch {
      setTags([])
    } finally {
      setLoadingTags(false)
    }
  }

  async function loadVersionDetail(vid: number | string) {
    setLoadingVersionDetail(true)
    try {
      const res: any = await getSkillVersionDetailApi({ versionId: vid })
      setVersionDetail(unwrapObject(res))
    } catch {
      setVersionDetail(null)
    } finally {
      setLoadingVersionDetail(false)
    }
  }

  async function loadFiles(vid: number | string) {
    setLoadingFiles(true)
    try {
      const res: any = await getSkillFileListApi({ versionId: vid })
      const list = unwrapRows(res)
      setFiles(
        list.map((r: any) => {
          if (typeof r === 'string') return { filePath: r, name: r.split('/').pop() }
          return {
            contentType: r.contentType,
            fileSize: r.fileSize ?? r.size,
            filePath: r.filePath ?? r.path ?? r.name,
            id: r.id,
            name: r.name || (r.filePath || r.path || '').split('/').pop(),
          }
        }),
      )
    } catch {
      setFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => {
    if (open && skillId) {
      setActiveVersionId(undefined)
      setVersionDetail(null)
      setLeftVersionDetail(null)
      setFiles([])
      setLeftFiles([])
      setDetail(null)
      setIntroduction('')
      setVersions([])
      // 先加载 detail 获取 sourceSkillId，再加载版本列表
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

  // activeVersionId 变化时不再自动加载，数据加载改为显式调用

  async function handleDownloadPackage() {
    if (!skillId) return
    setDownloading(true)
    try {
      const res: any = await downloadSkillPackageApi({ skillId })
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
      const res: any = await downloadSkillFileApi({ path, versionId: activeVersionId })
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
    modal.confirm({
      title: '确认发布该版本？',
      content: `版本 v${v.version || v.versionNo || vid} 将被设为最新版本，发布后会更新技能的 latestVersionId。`,
      okText: '发布',
      cancelText: '取消',
      onOk: async () => {
        setPublishingVid(vid)
        try {
          const res: any = await publishSkillVersionApi({ versionId: vid })
          if (res?.response?.data?.code === 200) {
            message.success('发布成功')
            loadVersions(undefined, false)
            loadDetail()
            // 发布后刷新左侧数据
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
    loadVersionDetail(vid)
    loadFiles(vid)
  }

  // 设为当前版本（左右两侧都刷新）
  function handleSetCurrentVersion(v: VersionItem) {
    const vid = v.versionId ?? v.id
    if (!vid || !skillId) return
    modal.confirm({
      title: '设为当前版本？',
      content: `将把 v${v.version || v.versionNo || vid} 设为当前对外展示的版本。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res: any = await selectSkillVersionApi({ skillId, versionId: vid })
          if (res?.response?.data?.code === 200 || res?.data?.code === 200) {
            message.success('已设为当前版本')
            setActiveVersionId(vid)
            loadVersionDetail(vid)
            loadFiles(vid)
            loadLeftVersionDetail(vid)
            loadLeftFiles(vid)
            loadVersions(undefined, false)
            loadDetail()
          } else {
            message.error(res?.response?.data?.msg || '操作失败')
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
    modal.confirm({
      title: '删除该版本？',
      content: `将删除版本 v${v.version || v.versionNo || vid}，删除后不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const res: any = await deleteSkillVersionApi({ versionId: vid })
          if (res?.response?.data?.code === 200 || res?.data?.code === 200) {
            message.success('删除成功')
            loadVersions(undefined, false)
            loadDetail()
          } else {
            message.error(res?.response?.data?.msg || '删除失败')
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
      const res: any = await addSkillTagApi({ skillId, tagName: t })
      if (res?.response?.data?.code === 200) {
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
      const res: any = await deleteSkillTagApi({ tagId: t.tagId })
      if (res?.response?.data?.code === 200) {
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
      const res: any = await updateSkillInfoApi({ skillId, visibility: next })
      const code = res?.response?.data?.code ?? res?.data?.code
      if (code === 200 || res?.response?.data?.success || res?.data?.success) {
        message.success(next === 'PUBLIC' ? '已设为公开' : '已设为私有')
        loadDetail()
      } else {
        setVisibility(prev)
        message.error(res?.response?.data?.msg || res?.data?.msg || '设置失败')
      }
    } catch (err: any) {
      setVisibility(prev)
      message.error(err?.message || '设置失败')
    } finally {
      setSavingVisibility(false)
    }
  }

  function handleDeleteSkill() {
    if (!skillId) return
    modal.confirm({
      title: '确认删除该技能？',
      content: `技能 「${skillName}」 删除后不可恢复，所有版本和文件均会一并删除。`,
      okType: 'danger',
      okText: '删除',
      cancelText: '取消',
      onOk: async () => {
        const res: any = await deleteSkillApi({ skillId })
        if (res?.response?.data?.code === 200) {
          message.success('删除成功')
          onDeleted?.()
        }
      },
    })
  }

  return (
    <CommonDrawer destroyOnClose open={open} rootClassName="skill-hub-scope" className="sd-v5-drawer" title={null} width={1200} onClose={onClose}>
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
                                {introFm.name && <div className="skill-intro-head__name">name: {introFm.name}</div>}
                                {introFm.description && <div className="skill-intro-head__desc">description: {introFm.description}</div>}
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
                          <Empty description="暂无文件" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                          <Empty description="暂无版本" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                      ) : (
                        <div className="sd-v5-version-list">
                          {versions.map((v) => {
                            const vid = v.versionId ?? v.id
                            const isActive = String(vid) === String(activeVersionId)
                            const isHeadline = headlineVersion && String(headlineVersion.versionId ?? headlineVersion.id) === String(vid)
                            const isDraft = v.status === 'DRAFT' || v.status === 'UPLOADED' || v.status === 'draft'
                            const vStatus = resolveStatusBadge(v.status)
                            return (
                              <div className={`sd-v5-ver ${isActive ? 'sd-v5-ver--active' : ''}`} key={vid} onClick={() => vid != null && handleVersionClick(vid)}>
                                <div className="sd-v5-ver__head">
                                  <div className="sd-v5-ver__left">
                                    <span className="sd-v5-chip">v{v.version || v.versionNo || vid}</span>
                                    {vStatus && (
                                      <span
                                        className={`sd-v5-pill ${vStatus.cls.includes('active') ? 'sd-v5-pill--active' : vStatus.cls.includes('hidden') ? 'sd-v5-pill--hidden' : vStatus.cls.includes('review') ? 'sd-v5-pill--review' : vStatus.cls.includes('rejected') ? 'sd-v5-pill--rejected' : 'sd-v5-pill--default'}`}
                                      >
                                        {vStatus.label}
                                      </span>
                                    )}
                                    {isHeadline && <span className="sd-v5-pill sd-v5-pill--current">当前版本</span>}
                                  </div>
                                  <div className="sd-v5-ver__actions" onClick={(e) => e.stopPropagation()}>
                                    <span className="sd-v5-ver__time">{formatDateTime(v.publishedAt || v.createTime)}</span>
                                    {isDraft && (
                                      <Button className="sd-v5-btn sd-v5-btn--primary" icon={<RocketOutlined />} loading={publishingVid === vid} size="small" onClick={() => handlePublishVersion(v)}>
                                        发布
                                      </Button>
                                    )}
                                    {!isDraft && !isHeadline && (
                                      <Button className="sd-v5-btn sd-v5-btn--primary" icon={<SwapOutlined />} size="small" onClick={() => handleSetCurrentVersion(v)}>
                                        设为当前
                                      </Button>
                                    )}
                                    <Button className="sd-v5-btn sd-v5-btn--danger" icon={<DeleteOutlined />} size="small" onClick={() => handleDeleteVersion(v)} />
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

            {/* 标签管理 */}
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

            {/* 可见范围 */}
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

            {/* 生命周期管理 */}
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
          </aside>
        </div>
      </Spin>
    </CommonDrawer>
  )
}

export default SkillDetailDrawer
