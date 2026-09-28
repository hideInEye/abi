import {
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  FolderOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { message, Modal, Select } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'

import { ScheduleTaskForm } from '@/components/layout/ScheduleTaskForm'
import { deleteJobInfo, fetchJobGroupList, fetchJobInfoList, startJob, stopJob, triggerJob } from '@/service/api/job'
import { formatJobScheduleText, JOB_SCENE_OPTIONS } from '@/utils/job-schedule'

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'running', label: '运行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'stopped', label: '已停止' },
]

const statusLabel: Record<string, string> = {
  running: '运行中',
  paused: '已暂停',
  stopped: '已停止',
}

interface ScheduleTask {
  id: string
  name: string
  freq: string
  type: string
  status: 'running' | 'paused' | 'stopped'
  creator: string
  created: string
  lastRun: string
}

// 调度中心时间字段可能是时间戳或字符串，统一转 'YYYY-MM-DD HH:mm'
function formatJobTime(value: any): string {
  if (value === undefined || value === null || value === '' || value === 0 || value === '0') return ''
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm') : String(value)
}

// 调度中心作业记录 -> 抽屉卡片 UI 字段
function toUiTask(record: any): ScheduleTask {
  const scene = JOB_SCENE_OPTIONS.find((option) => option.value === record.executorHandler)
  return {
    id: String(record.id ?? ''),
    name: record.name || '未命名任务',
    freq: formatJobScheduleText(record),
    type: scene?.label ?? record.executorHandler ?? '-',
    status: Number(record.triggerStatus) === 1 ? 'running' : 'stopped',
    creator: record.author || '-',
    created: formatJobTime(record.addTime ?? record.triggerAddTime) || '-',
    lastRun: formatJobTime(record.triggerLastTime) || '尚未执行',
  }
}

function isOk(res: any): boolean {
  return Boolean(res) && (res.code === 200 || res.code === '200' || res.success === true)
}

interface ScheduleTaskDrawerProps {
  open: boolean
  onClose: () => void
}

export function ScheduleTaskDrawer({ open, onClose }: ScheduleTaskDrawerProps) {
  const [rawList, setRawList] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ name: '', status: '', time: '' })
  // 高级筛选：草稿值在点击“查询”前不会生效
  const [advOpen, setAdvOpen] = useState(false)
  const [advDraft, setAdvDraft] = useState({ status: '', time: '' })
  const advRef = useRef<HTMLDivElement>(null)
  // 编辑面板：null 关闭；{ raw: undefined } 为新增任务；{ raw: 记录 } 为编辑
  const [formState, setFormState] = useState<{ raw: any } | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  // 执行器 id：调度中心 jobinfo/list 的必填参数，对齐管理端——先取执行器列表，默认「通用」否则首个
  const [jobGroup, setJobGroup] = useState<number | string | undefined>(undefined)

  const hasAdvFilter = filters.status !== '' || filters.time !== ''

  const loadTasks = async () => {
    if (jobGroup === undefined) return
    setLoading(true)
    try {
      const res: any = await fetchJobInfoList({ jobGroup, name: filters.name, pageNum: 1, pageSize: 9999 })
      const rows = Array.isArray(res?.data?.data) ? res.data.data : []
      setRawList(rows)
    } catch {
      message.error('任务列表加载失败')
    } finally {
      setLoading(false)
    }
  }

  // 打开抽屉时先解析默认执行器，拿到 jobGroup 后再查列表（列表接口缺 jobGroup 会被后端拒绝）
  useEffect(() => {
    if (!open || jobGroup !== undefined) return
    fetchJobGroupList({ pageNum: 1 })
      .then((res: any) => {
        const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data?.records) ? res.data.records : []
        const general = rows.find((group: any) => String(group.name || '').includes('通用')) ?? rows[0]
        setJobGroup(general?.id)
      })
      .catch(() => message.error('执行器列表加载失败'))
  }, [open, jobGroup])

  useEffect(() => {
    if (open && jobGroup !== undefined) {
      loadTasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobGroup])

  // 名称走服务端过滤，防抖请求；状态/时间在前端过滤
  useEffect(() => {
    if (!open || jobGroup === undefined) return
    const timer = setTimeout(() => {
      loadTasks()
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.name, jobGroup])

  const tasks = useMemo(() => {
    const list = rawList.map(toUiTask)
    return list.filter((task) => {
      if (filters.status && task.status !== filters.status) return false
      if (filters.time && !task.created.startsWith(filters.time)) return false
      return true
    })
  }, [rawList, filters.status, filters.time])

  const stats = useMemo(() => {
    const all = rawList.map(toUiTask)
    return {
      total: all.length,
      running: all.filter((t) => t.status === 'running').length,
      paused: all.filter((t) => t.status === 'paused').length,
      stopped: all.filter((t) => t.status === 'stopped').length,
    }
  }, [rawList])

  // 高级筛选面板外部点击关闭
  useEffect(() => {
    if (!advOpen) return
    const handler = (e: MouseEvent) => {
      if (advRef.current && !advRef.current.contains(e.target as Node)) {
        setAdvOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [advOpen])

  const toggleAdv = () => {
    setAdvOpen((o) => {
      // 打开时用当前已生效的筛选值初始化草稿
      if (!o) setAdvDraft({ status: filters.status, time: filters.time })
      return !o
    })
  }

  const handleApplyAdv = () => {
    setFilters((f) => ({ ...f, status: advDraft.status, time: advDraft.time }))
    setAdvOpen(false)
  }

  const handleResetAdv = () => {
    setAdvDraft({ status: '', time: '' })
    setFilters((f) => ({ ...f, status: '', time: '' }))
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    const res: any = await deleteJobInfo(deleteId)
    if (!isOk(res)) {
      message.error(res?.message || '删除失败')
      return
    }
    message.success('删除成功')
    setDeleteId(null)
    await loadTasks()
  }

  const handleRun = async (task: ScheduleTask) => {
    const res: any = await triggerJob(task.id)
    if (!isOk(res)) {
      message.error(res?.message || '执行失败')
      return
    }
    message.success('已触发执行')
    await loadTasks()
  }

  const handleToggleStatus = async (task: ScheduleTask) => {
    const res: any = task.status === 'running' ? await stopJob(task.id) : await startJob(task.id)
    if (!isOk(res)) {
      message.error(res?.message || '状态切换失败')
      return
    }
    message.success(task.status === 'running' ? '已停止' : '已启动')
    await loadTasks()
  }

  return (
    <>
      <div className={`schedule-drawer-overlay ${open ? 'show' : ''}`} onClick={onClose} />
      <div className={`schedule-drawer ${open ? 'open' : ''}`}>
        <div className="schedule-drawer-header">
          <div className="schedule-drawer-title">
            <ClockCircleOutlined />
            <span>定时任务</span>
          </div>
          <button type="button" className="schedule-drawer-close" onClick={onClose}>
            <CloseOutlined />
          </button>
        </div>

        <div className="schedule-drawer-body">
          {/* 统计 */}
          <div className="schedule-stats-row">
            <div className="schedule-stat-card">
              <div className="schedule-stat-num" style={{ color: 'var(--accent)' }}>
                {stats.total}
              </div>
              <div className="schedule-stat-label">全部</div>
            </div>
            <div className="schedule-stat-card">
              <div className="schedule-stat-num" style={{ color: '#10b981' }}>
                {stats.running}
              </div>
              <div className="schedule-stat-label">运行中</div>
            </div>
            <div className="schedule-stat-card">
              <div className="schedule-stat-num" style={{ color: 'var(--accent-2)' }}>
                {stats.paused}
              </div>
              <div className="schedule-stat-label">已暂停</div>
            </div>
            <div className="schedule-stat-card">
              <div className="schedule-stat-num" style={{ color: 'var(--accent-orange)' }}>
                {stats.stopped}
              </div>
              <div className="schedule-stat-label">已停止</div>
            </div>
          </div>

          {/* 搜索 + 高级筛选 + 新增任务 */}
          <div className="schedule-toolbar" ref={advRef}>
            <div className="schedule-search-field" style={{ flex: 1 }}>
              <SearchOutlined />
              <input
                type="text"
                placeholder="搜索任务名称…"
                value={filters.name}
                onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <button
              type="button"
              className={`schedule-adv-btn ${advOpen ? 'active' : ''} ${hasAdvFilter ? 'has-filter' : ''}`}
              onClick={toggleAdv}
              title="高级筛选"
            >
              <FilterOutlined />
            </button>
            <button type="button" className="schedule-add-btn" onClick={() => setFormState({ raw: undefined })}>
              <PlusOutlined />
              新增任务
            </button>

            {advOpen && (
              <div className="schedule-adv-panel">
                <div className="schedule-adv-grid">
                  <div className="schedule-adv-field">
                    <label>任务状态</label>
                    <Select
                      className="schedule-form-select"
                      popupClassName="schedule-form-select-popup"
                      value={advDraft.status}
                      options={statusOptions}
                      onChange={(value) => setAdvDraft((d) => ({ ...d, status: value }))}
                      popupMatchSelectWidth={false}
                    />
                  </div>
                  <div className="schedule-adv-field">
                    <label>时间范围</label>
                    <input
                      type="date"
                      className="schedule-adv-date"
                      value={advDraft.time}
                      onChange={(e) => setAdvDraft((d) => ({ ...d, time: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="schedule-adv-actions">
                  <button type="button" className="schedule-adv-reset" onClick={handleResetAdv}>
                    <ReloadOutlined />
                    重置
                  </button>
                  <button type="button" className="schedule-adv-query" onClick={handleApplyAdv}>
                    <SearchOutlined />
                    查询
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 新增/编辑表单：管理端同款三分区结构 */}
          {formState && (
            <ScheduleTaskForm
              defaultJobGroup={jobGroup}
              initial={formState.raw}
              onClose={() => setFormState(null)}
              onSuccess={loadTasks}
            />
          )}

          {/* 任务列表 */}
          <div className="schedule-task-list">
            {loading ? (
              <div className="schedule-empty">加载中…</div>
            ) : tasks.length === 0 ? (
              <div className="schedule-empty">
                <ClockCircleOutlined />
                <span>暂无匹配的定时任务</span>
              </div>
            ) : (
              tasks.map((task) => (
                <div key={task.id} className="schedule-task-card">
                  <div className="schedule-task-head">
                    <div className="schedule-task-name">{task.name}</div>
                    <button
                      type="button"
                      className={`schedule-status ${task.status}`}
                      onClick={() => handleToggleStatus(task)}
                      title={task.status === 'running' ? '点击停止' : '点击启动'}
                    >
                      {statusLabel[task.status]}
                    </button>
                  </div>
                  <div className="schedule-task-meta">
                    <div className="schedule-meta-item">
                      <ClockCircleOutlined />
                      {task.freq}
                    </div>
                    <div className="schedule-meta-item">
                      <FolderOutlined />
                      {task.type}
                    </div>
                    <div className="schedule-meta-item">
                      <UserOutlined />
                      {task.creator}
                    </div>
                    <div className="schedule-meta-item">
                      <ReloadOutlined />
                      {task.lastRun}
                    </div>
                  </div>
                  <div className="schedule-task-footer">
                    <button
                      type="button"
                      className="schedule-task-action"
                      onClick={() => setFormState({ raw: rawList.find((item) => String(item.id) === task.id) })}
                    >
                      <EditOutlined />
                      编辑
                    </button>
                    <button type="button" className="schedule-task-action" onClick={() => handleToggleStatus(task)}>
                      {task.status === 'running' ? <PauseOutlined /> : <PlayCircleOutlined />}
                      {task.status === 'running' ? '停止' : '启动'}
                    </button>
                    <button type="button" className="schedule-task-action run" onClick={() => handleRun(task)}>
                      <ReloadOutlined />
                      执行
                    </button>
                    <button type="button" className="schedule-task-action danger" onClick={() => setDeleteId(task.id)}>
                      <DeleteOutlined />
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal
        title="确认删除"
        open={Boolean(deleteId)}
        onOk={confirmDelete}
        onCancel={() => setDeleteId(null)}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除定时任务 “{tasks.find((t) => t.id === deleteId)?.name || ''}” 吗？此操作不可恢复。</p>
      </Modal>
    </>
  )
}
