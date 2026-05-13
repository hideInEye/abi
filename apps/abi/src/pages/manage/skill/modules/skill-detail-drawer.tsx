import {
  CloseOutlined,
  CloudDownloadOutlined,
  DeleteOutlined,
  DownOutlined,
  DownloadOutlined,
  FileOutlined,
  FolderOutlined,
  GlobalOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  RocketOutlined,
  TagOutlined,
  UserOutlined
} from '@ant-design/icons';
import { App, Button, Drawer, Empty, Input, Spin, Tabs, Tag, Tooltip, Tree } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { useEffect, useMemo, useState } from 'react';

import {
  addSkillTagApi,
  deleteSkillTagApi,
  downloadSkillFileApi,
  downloadSkillPackageApi,
  getSkillDetailApi,
  getSkillFileListApi,
  getSkillTagListApi,
  getSkillVersionDetailApi,
  getSkillVersionListApi,
  publishSkillVersionApi
} from '@/service/api/skill';

import '../skill.css';

type SkillItem = {
  skillId?: number | string;
  id?: number | string;
  skillName?: string;
  displayName?: string;
  name?: string;
  title?: string;
  namespace?: string;
  namespaceSlug?: string;
  spaceName?: string;
  summary?: string;
  description?: string;
  status?: string;
  visibility?: string;
  latestVersion?: string;
  version?: string;
  latestVersionId?: number | string;
  downloadCount?: number;
  downloads?: number;
  starCount?: number;
  ratingAvg?: number;
  ratingCount?: number;
  ownerDisplayName?: string;
  ownerName?: string;
  createdBy?: string;
  createTime?: string;
  updateTime?: string;
  publishedAt?: string;
  labels?: any[];
};

type VersionItem = {
  versionId?: number | string;
  id?: number | string;
  version?: string;
  versionNo?: string;
  status?: string;
  changelog?: string;
  createTime?: string;
  publishedAt?: string;
  fileCount?: number;
  totalSize?: number;
};

type FileItem = {
  id?: number | string;
  filePath?: string;
  path?: string;
  name?: string;
  fileSize?: number;
  size?: number;
  contentType?: string;
  type?: string;
};

type TagItem = {
  tagId?: number | string;
  tagName: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  skill?: SkillItem | null;
};

function formatFileSize(bytes?: number) {
  if (!bytes) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

function unwrapRows(res: any): any[] {
  const rows =
    res?.response?.data?.data?.rows ||
    res?.response?.data?.data ||
    res?.response?.data?.rows ||
    res?.data?.rows ||
    res?.data?.data ||
    res?.data ||
    [];
  return Array.isArray(rows) ? rows : [];
}

function unwrapObject(res: any): any {
  return res?.response?.data?.data || res?.data?.data || res?.data || {};
}

function triggerDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function resolveBlob(res: any): Blob | null {
  const payload = res?.response?.data ?? res?.data ?? res;
  if (payload instanceof Blob) return payload;
  return null;
}

/** 根据 filePath 构建树形结构 */
function buildFileTree(files: FileItem[]): { tree: DataNode[]; map: Record<string, FileItem> } {
  const root: Record<string, any> = {};
  const map: Record<string, FileItem> = {};
  files.forEach(f => {
    const p = f.filePath || f.path || f.name || '';
    if (!p) return;
    map[p] = f;
    const parts = p.split('/').filter(Boolean);
    let node: Record<string, any> = root;
    parts.forEach((part, idx) => {
      if (!node[part]) {
        node[part] = { __children: {}, __path: parts.slice(0, idx + 1).join('/'), __isLeaf: false };
      }
      if (idx === parts.length - 1) {
        node[part].__isLeaf = true;
        node[part].__file = f;
      }
      node = node[part].__children;
    });
  });

  const toTree = (obj: Record<string, any>): DataNode[] =>
    Object.keys(obj)
      .sort((a, b) => {
        const ax = obj[a].__isLeaf && Object.keys(obj[a].__children).length === 0;
        const bx = obj[b].__isLeaf && Object.keys(obj[b].__children).length === 0;
        if (ax === bx) return a.localeCompare(b);
        return ax ? 1 : -1;
      })
      .map(key => {
        const val = obj[key];
        const children = toTree(val.__children);
        const isFile = children.length === 0 && val.__isLeaf;
        return {
          key: val.__path,
          title: key,
          icon: isFile ? <FileOutlined /> : <FolderOutlined />,
          isLeaf: isFile,
          children: children.length ? children : undefined
        } as DataNode;
      });

  return { tree: toTree(root), map };
}

function resolveStatusBadge(status?: string) {
  if (!status) return null;
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'PUBLISHED' || s === '1') return { cls: 'sd-badge--active', label: '已发布' };
  if (s === 'ARCHIVED') return { cls: 'sd-badge--archived', label: '已归档' };
  if (s === 'HIDDEN' || s === '0') return { cls: 'sd-badge--hidden', label: '已隐藏' };
  if (s === 'PENDING_REVIEW') return { cls: 'sd-badge--review', label: '审核中' };
  if (s === 'REJECTED') return { cls: 'sd-badge--rejected', label: '已驳回' };
  if (s === 'SCANNING' || s === 'UPLOADED') return { cls: 'sd-badge--scanning', label: '扫描中' };
  if (s === 'DRAFT') return { cls: 'sd-badge--hidden', label: '草稿' };
  return { cls: 'sd-badge--archived', label: status };
}

function resolveVisibilityBadge(visibility?: string) {
  if (!visibility) return null;
  const v = visibility.toUpperCase();
  if (v === 'PUBLIC') return { cls: 'sd-badge--public', icon: <GlobalOutlined />, label: '公开' };
  if (v === 'PRIVATE') return { cls: 'sd-badge--private', icon: <LockOutlined />, label: '私有' };
  if (v === 'NAMESPACE_ONLY') return { cls: 'sd-badge--ns', icon: <UserOutlined />, label: '空间内' };
  return null;
}

const SkillDetailDrawer: FC<Props> = ({ onClose, open, skill }) => {
  const { message, modal } = App.useApp();

  const [detail, setDetail] = useState<SkillItem | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<number | string | undefined>(undefined);
  const [versionDetail, setVersionDetail] = useState<any>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingVersionDetail, setLoadingVersionDetail] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [publishingVid, setPublishingVid] = useState<number | string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [fileBrowserOpen, setFileBrowserOpen] = useState(true);

  const src: any = detail || skill || {};
  const skillId = skill?.id;
  const skillName = src.bizName;
  const namespace = src.spaceId;
  const summary = src.summary;
  const ownerName = src.createdBy;
  const downloads = 0;
  const statusBadge = resolveStatusBadge(src.status);
  const visibilityBadge = resolveVisibilityBadge(src.visibility);
  const activeVersion = versions.find(v => String(v.versionId ?? v.id) === String(activeVersionId));
  const headlineVersion = versions.find(v => String(v.versionId ?? v.id) === String(src.latestVersionId)) || versions[0];

  const { tree: fileTree, map: fileMap } = useMemo(() => buildFileTree(files), [files]);

  async function loadDetail() {
    if (!skillId) return;
    setLoadingDetail(true);
    try {
      const res: any = await getSkillDetailApi({ skillId });
      const d = unwrapObject(res);
      if (d && Object.keys(d).length) setDetail(d);
    } catch {
      /* ignore */
    } finally {
      setLoadingDetail(false);
    }
  }

  async function loadVersions(autoSelect = true) {
    if (!skillId) return;
    setLoadingVersions(true);
    try {
      const res: any = await getSkillVersionListApi({ skillId });
      const list = unwrapRows(res);
      setVersions(list);
      if (autoSelect && list.length) {
        const firstId = src.latestVersionId || list[0].versionId || list[0].id;
        setActiveVersionId(firstId);
      }
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }

  async function loadTags() {
    if (!skillId) return;
    setLoadingTags(true);
    try {
      const res: any = await getSkillTagListApi({ skillId });
      const list = unwrapRows(res);
      setTags(
        list.map((r: any) => ({
          tagId: r.tagId ?? r.id,
          tagName: r.tagName ?? r.name ?? String(r)
        }))
      );
    } catch {
      setTags([]);
    } finally {
      setLoadingTags(false);
    }
  }

  async function loadVersionDetail(vid: number | string) {
    setLoadingVersionDetail(true);
    try {
      const res: any = await getSkillVersionDetailApi({ versionId: vid });
      setVersionDetail(unwrapObject(res));
    } catch {
      setVersionDetail(null);
    } finally {
      setLoadingVersionDetail(false);
    }
  }

  async function loadFiles(vid: number | string) {
    setLoadingFiles(true);
    try {
      const res: any = await getSkillFileListApi({ versionId: vid });
      const list = unwrapRows(res);
      setFiles(
        list.map((r: any) => {
          if (typeof r === 'string') return { filePath: r, name: r.split('/').pop() };
          return {
            contentType: r.contentType,
            fileSize: r.fileSize ?? r.size,
            filePath: r.filePath ?? r.path ?? r.name,
            id: r.id,
            name: r.name || (r.filePath || r.path || '').split('/').pop()
          };
        })
      );
    } catch {
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }

  useEffect(() => {
    if (open && skillId) {
      setActiveVersionId(undefined);
      setVersionDetail(null);
      setFiles([]);
      setDetail(null);
      loadDetail();
      loadVersions();
      loadTags();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, skillId]);

  useEffect(() => {
    if (activeVersionId != null) {
      loadVersionDetail(activeVersionId);
      loadFiles(activeVersionId);
    }
  }, [activeVersionId]);

  async function handleDownloadPackage() {
    if (!skillId) return;
    setDownloading(true);
    try {
      const res: any = await downloadSkillPackageApi({ skillId });
      const blob = resolveBlob(res);
      if (!blob) {
        message.error('下载失败');
        return;
      }
      triggerDownload(blob, `${skillName || 'skill'}.zip`);
      message.success('开始下载');
    } catch (err: any) {
      message.error(err?.message || '下载失败');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadFile(path: string) {
    if (!activeVersionId || !path) return;
    try {
      const res: any = await downloadSkillFileApi({ path, versionId: activeVersionId });
      const blob = resolveBlob(res);
      if (!blob) {
        message.error('下载失败');
        return;
      }
      triggerDownload(blob, path.split('/').pop() || 'file');
    } catch (err: any) {
      message.error(err?.message || '下载失败');
    }
  }

  function handlePublishVersion(v: VersionItem) {
    const vid = v.versionId ?? v.id;
    if (!vid) return;
    modal.confirm({
      title: '确认发布该版本？',
      content: `版本 v${v.version || v.versionNo || vid} 将被设为最新版本，发布后会更新技能的 latestVersionId。`,
      okText: '发布',
      cancelText: '取消',
      onOk: async () => {
        setPublishingVid(vid);
        try {
          const res: any = await publishSkillVersionApi({ versionId: vid });
          if (res?.response?.data?.code === 200 || res?.data != null) {
            message.success('发布成功');
            loadVersions(false);
            loadDetail();
          }
        } catch (err: any) {
          message.error(err?.message || '发布失败');
        } finally {
          setPublishingVid(null);
        }
      }
    });
  }

  async function handleAddTag() {
    const t = newTag.trim();
    if (!skillId || !t) return;
    setAddingTag(true);
    try {
      const res: any = await addSkillTagApi({ skillId, tagName: t });
      if (res?.response?.data?.code === 200 || res?.data != null) {
        message.success('添加成功');
        setNewTag('');
        loadTags();
      }
    } catch (err: any) {
      message.error(err?.message || '添加失败');
    } finally {
      setAddingTag(false);
    }
  }

  async function handleDeleteTag(t: TagItem) {
    if (!skillId) return;
    try {
      const res: any = await deleteSkillTagApi({ skillId, tagName: t.tagName });
      if (res?.response?.data?.code === 200 || res?.data != null) {
        message.success('删除成功');
        loadTags();
      }
    } catch (err: any) {
      message.error(err?.message || '删除失败');
    }
  }

  return (
    <Drawer
      destroyOnClose
      open={open}
      rootClassName="skill-hub-scope"
      title={null}
      width={1200}
      closeIcon={<CloseOutlined />}
      onClose={onClose}
    >
      <Spin spinning={loadingDetail && !detail}>
        {/* 两栏布局：左主栏（头部信息 + Tabs）+ 右侧栏 */}
        <div className="flex gap-24px">
          {/* 左主栏 */}
          <div className="min-w-0 flex-1">
            {/* 顶部信息区 */}
            <div className="sd-header mb-20px">
              <div className="flex flex-wrap items-center gap-8px">
                {namespace && (
                  <span className="sd-badge sd-badge--ns">
                    @{String(namespace).replace(/^@/, '')}
                  </span>
                )}
                {statusBadge && <span className={`sd-badge ${statusBadge.cls}`}>{statusBadge.label}</span>}
                {visibilityBadge && (
                  <span className={`sd-badge ${visibilityBadge.cls}`}>
                    {visibilityBadge.icon}
                    {visibilityBadge.label}
                  </span>
                )}
              </div>

              <div className="sd-title">{skillName}</div>

              {ownerName && (
                <div className="flex items-center gap-6px text-13px text-gray-500">
                  <UserOutlined />
                  <span>作者：{ownerName}</span>
                </div>
              )}

              {summary && <div className="sd-summary">{summary}</div>}

              {Array.isArray(src.labels) && src.labels.length > 0 && (
                <div className="flex flex-wrap gap-6px">
                  {src.labels.map((lb: any, idx: number) => (
                    <Tag color="geekblue" key={lb.slug || lb.id || idx}>
                      {lb.displayName || lb.name || lb}
                    </Tag>
                  ))}
                </div>
              )}
            </div>

            <Tabs
              defaultActiveKey="overview"
              className="skill-detail-tabs"
              items={[
                {
                  key: 'overview',
                  label: '概览',
                  children: (
                    <Spin spinning={loadingVersionDetail}>
                      <div className="rounded-8px border border-gray-200 bg-white p-20px">
                        <div className="mb-16px flex items-center justify-between">
                          <div className="text-14px font-600 text-gray-800">版本说明</div>
                          {activeVersion && (
                            <span className="sd-version-chip">v{activeVersion.version || activeVersion.versionNo}</span>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap text-13px leading-22px text-gray-700">
                          {versionDetail?.changelog || activeVersion?.changelog || '暂无版本说明'}
                        </div>

                        {(versionDetail?.readme || versionDetail?.description) && (
                          <>
                            <div className="my-16px h-1px bg-gray-100" />
                            <div className="mb-12px text-14px font-600 text-gray-800">README</div>
                            <div className="whitespace-pre-wrap text-13px leading-22px text-gray-600">
                              {versionDetail.readme || versionDetail.description}
                            </div>
                          </>
                        )}

                        {versionDetail?.manifestJson && (
                          <>
                            <div className="my-16px h-1px bg-gray-100" />
                            <div className="mb-12px text-14px font-600 text-gray-800">Manifest</div>
                            <pre className="m-0 max-h-300px overflow-auto rounded-6px bg-gray-50 p-12px text-12px text-gray-700">
                              {typeof versionDetail.manifestJson === 'string'
                                ? versionDetail.manifestJson
                                : JSON.stringify(versionDetail.manifestJson, null, 2)}
                            </pre>
                          </>
                        )}
                      </div>
                    </Spin>
                  )
                },
                {
                  key: 'files',
                  label: `文件（${files.length}）`,
                  children: (
                    <Spin spinning={loadingFiles}>
                      {files.length === 0 && !loadingFiles ? (
                        <div className="py-60px">
                          <Empty description="暂无文件" />
                        </div>
                      ) : (
                        <div className="sd-file-tree">
                          <Tree
                            showIcon
                            defaultExpandAll
                            treeData={fileTree}
                            titleRender={(node: any) => {
                              const f = fileMap[node.key as string];
                              if (!f) return <span>{node.title as any}</span>;
                              return (
                                <div className="flex items-center justify-between gap-12px pr-8px">
                                  <span className="truncate text-13px">{node.title as any}</span>
                                  <div className="flex flex-shrink-0 items-center gap-12px">
                                    {f.fileSize != null && (
                                      <span className="text-12px text-gray-400">
                                        {formatFileSize(f.fileSize)}
                                      </span>
                                    )}
                                    <Tooltip title="下载">
                                      <Button
                                        icon={<DownloadOutlined />}
                                        size="small"
                                        type="text"
                                        onClick={e => {
                                          e.stopPropagation();
                                          handleDownloadFile((f.filePath || f.path) as string);
                                        }}
                                      />
                                    </Tooltip>
                                  </div>
                                </div>
                              );
                            }}
                          />
                        </div>
                      )}
                    </Spin>
                  )
                },
                {
                  key: 'versions',
                  label: `版本（${versions.length}）`,
                  children: (
                    <Spin spinning={loadingVersions}>
                      {versions.length === 0 && !loadingVersions ? (
                        <div className="py-60px">
                          <Empty description="暂无版本" />
                        </div>
                      ) : (
                        <div>
                          {versions.map(v => {
                            const vid = v.versionId ?? v.id;
                            const isActive = String(vid) === String(activeVersionId);
                            const isHeadline = headlineVersion && String(headlineVersion.versionId ?? headlineVersion.id) === String(vid);
                            const isDraft = v.status === 'DRAFT' || v.status === 'UPLOADED' || v.status === 'draft';
                            const vStatus = resolveStatusBadge(v.status);
                            return (
                              <div
                                className="sd-version-item cursor-pointer"
                                key={vid}
                                style={isActive ? { borderColor: '#6A6DFF' } : undefined}
                                onClick={() => setActiveVersionId(vid)}
                              >
                                <div className="mb-8px flex flex-wrap items-center justify-between gap-8px">
                                  <div className="flex flex-wrap items-center gap-8px">
                                    <span className="sd-version-chip">v{v.version || v.versionNo || vid}</span>
                                    {vStatus && <span className={`sd-badge ${vStatus.cls}`}>{vStatus.label}</span>}
                                    {isHeadline && <span className="sd-version-current">当前版本</span>}
                                  </div>
                                  <div
                                    className="flex items-center gap-8px"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <span className="text-12px text-gray-400">
                                      {v.publishedAt || v.createTime || ''}
                                    </span>
                                    {isDraft && (
                                      <Button
                                        className="brand-button"
                                        icon={<RocketOutlined />}
                                        loading={publishingVid === vid}
                                        size="small"
                                        type="primary"
                                        onClick={() => handlePublishVersion(v)}
                                      >
                                        发布
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {v.changelog && (
                                  <div className="text-13px leading-20px text-gray-600">{v.changelog}</div>
                                )}
                                <div className="mt-8px flex items-center gap-12px text-12px text-gray-400">
                                  {v.fileCount != null && <span>{v.fileCount} 个文件</span>}
                                  {v.totalSize != null && <span>{formatFileSize(v.totalSize)}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Spin>
                  )
                },
                {
                  key: 'tags',
                  label: (
                    <span>
                      <TagOutlined /> 标签（{tags.length}）
                    </span>
                  ),
                  children: (
                    <Spin spinning={loadingTags}>
                      <div className="rounded-8px border border-gray-200 bg-white p-20px">
                        <div className="mb-16px flex gap-8px">
                          <Input
                            placeholder="输入标签名称"
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            onPressEnter={handleAddTag}
                          />
                          <Button
                            className="brand-button"
                            icon={<PlusOutlined />}
                            loading={addingTag}
                            type="primary"
                            onClick={handleAddTag}
                          >
                            添加标签
                          </Button>
                        </div>
                        {tags.length === 0 ? (
                          <Empty description="暂无标签" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        ) : (
                          <div className="flex flex-wrap gap-8px">
                            {tags.map(t => (
                              <Tag
                                closable
                                color="purple"
                                closeIcon={<DeleteOutlined />}
                                key={t.tagId ?? t.tagName}
                                onClose={e => {
                                  e.preventDefault();
                                  handleDeleteTag(t);
                                }}
                              >
                                {t.tagName}
                              </Tag>
                            ))}
                          </div>
                        )}
                      </div>
                    </Spin>
                  )
                }
              ]}
            />
          </div>

          {/* 右侧信息栏 */}
          <aside className="w-280px flex-shrink-0">
            <div className="sd-info-card mb-12px">
              <Button
                block
                className="brand-button"
                icon={<CloudDownloadOutlined />}
                loading={downloading}
                size="large"
                type="primary"
                onClick={handleDownloadPackage}
              >
                下载技能包
              </Button>
              <Button
                block
                className="mt-8px"
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadDetail();
                  loadVersions(false);
                  loadTags();
                  if (activeVersionId != null) {
                    loadVersionDetail(activeVersionId);
                    loadFiles(activeVersionId);
                  }
                }}
              >
                刷新数据
              </Button>
            </div>

            {/* 文件浏览（侧栏版） */}
            {files.length > 0 && (
              <div className="sd-info-card mb-12px">
                <button
                  aria-expanded={fileBrowserOpen}
                  className="flex w-full cursor-pointer items-center gap-6px border-0 bg-transparent p-0 text-left"
                  type="button"
                  onClick={() => setFileBrowserOpen(v => !v)}
                >
                  <FolderOutlined className="text-gray-500" />
                  <span className="text-13px font-600 text-gray-800">文件浏览</span>
                  <span className="ml-auto mr-4px text-12px text-gray-400">{files.length}</span>
                  <DownOutlined
                    className="text-12px text-gray-400 transition-transform"
                    style={{ transform: fileBrowserOpen ? 'rotate(180deg)' : 'none' }}
                  />
                </button>
                {fileBrowserOpen && (
                  <div className="mt-12px max-h-400px overflow-auto">
                    <Tree
                      showIcon
                      defaultExpandAll
                      treeData={fileTree}
                      titleRender={(node: any) => {
                        const f = fileMap[node.key as string];
                        if (!f) return <span className="text-13px">{node.title as any}</span>;
                        return (
                          <div className="flex items-center justify-between gap-6px pr-4px">
                            <span className="truncate text-12px">{node.title as any}</span>
                            <Tooltip title="下载">
                              <Button
                                icon={<DownloadOutlined />}
                                size="small"
                                type="text"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDownloadFile((f.filePath || f.path) as string);
                                }}
                              />
                            </Tooltip>
                          </div>
                        );
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="sd-info-card mb-12px">
              <div className="sd-info-row">
                <span className="sd-info-row__label">当前版本</span>
                <span className="sd-info-row__value">
                  {headlineVersion ? `v${headlineVersion.version || headlineVersion.versionNo}` : '—'}
                </span>
              </div>
              <div className="sd-info-row">
                <span className="sd-info-row__label">下载量</span>
                <span className="sd-info-row__value">{downloads}</span>
              </div>
              {src.starCount != null && (
                <div className="sd-info-row">
                  <span className="sd-info-row__label">收藏数</span>
                  <span className="sd-info-row__value">{src.starCount}</span>
                </div>
              )}
              {src.ratingCount != null && src.ratingCount > 0 && (
                <div className="sd-info-row">
                  <span className="sd-info-row__label">评分</span>
                  <span className="sd-info-row__value">
                    {src.ratingAvg != null ? src.ratingAvg.toFixed(1) : '-'} / 5
                  </span>
                </div>
              )}
              <div className="sd-info-row">
                <span className="sd-info-row__label">命名空间</span>
                <span className="sd-info-row__value truncate max-w-160px">
                  @{String(namespace || '').replace(/^@/, '') || '-'}
                </span>
              </div>
              {src.createTime && (
                <div className="sd-info-row">
                  <span className="sd-info-row__label">创建时间</span>
                  <span className="sd-info-row__value text-12px">{src.createTime}</span>
                </div>
              )}
              {src.updateTime && (
                <div className="sd-info-row">
                  <span className="sd-info-row__label">更新时间</span>
                  <span className="sd-info-row__value text-12px">{src.updateTime}</span>
                </div>
              )}
            </div>

            {tags.length > 0 && (
              <div className="sd-info-card">
                <div className="mb-8px text-13px font-600 text-gray-800">
                  <TagOutlined /> 标签
                </div>
                <div className="flex flex-wrap gap-4px">
                  {tags.map(t => (
                    <Tag color="purple" key={t.tagId ?? t.tagName}>
                      {t.tagName}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </Spin>
    </Drawer>
  );
};

export default SkillDetailDrawer;
