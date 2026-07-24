import {
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  FilterOutlined,
  FolderOutlined,
  PauseOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Modal, Select } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  addJob,
  batchDeleteJob,
  deleteJob,
  fetchChangeStatus,
  fetchJobList,
  runJob,
  updateJob,
} from '@/service/api/job'

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'running', label: '运行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'stopped', label: '已停止' },
]

const freqOptions = [
  { value: '', label: '请选择' },
  { value: '每分钟', label: '每分钟' },
  { value: '每小时', label: '每小时' },
  { value: '每天 09:00', label: '每天 09:00' },
  { value: '每天 18:00', label: '每天 18:00' },
  { value: '每周一 09:00', label: '每周一 09:00' },
  { value: '每月1号 00:00', label: '每月1号 00:00' },
  { value: '自定义 Cron', label: '自定义 Cron' },
]

const typeOptions = [
  { value: '数据查询', label: '数据查询' },
  { value: '报告生成', label: '报告生成' },
  { value: '数据同步', label: '数据同步' },
  { value: '告警推送', label: '告警推送' },
  { value: '智能分析', label: '智能分析' },
]

const formStatusOptions = [
  { value: 'running', label: '运行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'stopped', label: '已停止' },
]

interface ScheduleTask {
  id: string
  name: string
  freq: string
  type: string
  status: 'running' | 'paused' | 'stopped'
  desc: string
  creator: string
  created: string
  lastRun: string
}

interface TaskForm {
  name: string
  freq: string
  type: string
  status: ScheduleTask['status']
  desc: string
}

// ============================================================
// 定时任务 API 层：当前为 mock 实现，已对齐真实接口字段
// 后续只需把 useRealApi 置为 true 并接入项目 request 封装即可。
//
// 对接接口列表（来源：apps/abi/src/service/api/job.ts）
// ------------------------------------------------------------
// 1. 查询列表   POST /api/abi-system/shared/jobList      -> fetchList
// 2. 新增任务   POST /api/abi-job/job                     -> add
// 3. 更新任务   PUT  /api/abi-job/job                     -> update
// 4. 删除任务   POST /api/abi-system/shared/delete        -> delete
// 5. 批量删除   POST /api/abi-system/shared/batchDelete   -> batchDelete
// 6. 切换状态   PUT  /api/abi-system/shared/changeStatus  -> toggleStatus
// 7. 立即执行   PUT  /api/abi-job/job/run                 -> run
// 8. 任务详情   GET  /api/abi-job/job/{jobId}             -> detail
// ------------------------------------------------------------
// 真实字段：jobId, jobName, jobGroup, cycle, status('0'/'1'),
//           createBy, createTime, lastSendTime, nextExecuteTime
// UI 字段：  id, name, type, freq, status, creator, created, lastRun
// ============================================================
const scheduleApi = {
  useRealApi: true,

  _delay(ms = 200) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms)
    })
  },

  _now() {
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`
  },

  _toUi(record: any): ScheduleTask {
    const statusMap: Record<string, ScheduleTask['status']> = { '0': 'running', '1': 'paused' }
    return {
      id: String(record.jobId ?? record.recordId ?? record.id ?? ''),
      name: record.jobName ?? record.name ?? '未命名任务',
      type: record.jobGroup ?? record.type ?? '数据查询',
      freq: record.cycle ?? record.freq ?? '每天 09:00',
      status: record.uiStatus ?? statusMap[record.status] ?? 'running',
      desc: record.remark ?? record.desc ?? '',
      creator: record.createBy ?? record.creator ?? '当前用户',
      created: record.createTime ?? record.created ?? this._now(),
      lastRun: record.lastSendTime ?? record.lastRun ?? '尚未执行',
    }
  },

  _toPayload(task: Partial<ScheduleTask>) {
    const statusReverse: Record<string, string> = { running: '0', paused: '1', stopped: '1' }
    return {
      jobId: task.id,
      jobName: task.name,
      jobGroup: task.type,
      cycle: task.freq,
      status: statusReverse[task.status ?? 'running'] || '0',
      remark: task.desc,
    }
  },

  _unwrapRows(res: any): any[] {
    const data = res?.data ?? res
    return data?.records ?? data?.list ?? data?.data ?? (Array.isArray(data) ? data : [])
  },

  _isOk(res: any): boolean {
    return res && (res.code === 200 || res.code === '200' || res.success === true)
  },

  async fetchList(filters: { name?: string; status?: string; time?: string } = {}): Promise<ScheduleTask[]> {
    if (!this.useRealApi) {
      await this._delay(200)
      let rows = [...mockTasks]
      if (filters.name) {
        const q = filters.name.toLowerCase()
        rows = rows.filter((t) => t.name.toLowerCase().includes(q))
      }
      if (filters.status) {
        rows = rows.filter((t) => t.status === filters.status)
      }
      if (filters.time) {
        rows = rows.filter((t) => t.created.startsWith(filters.time as string))
      }
      return rows
    }

    const statusReverse: Record<string, string> = { running: '0', paused: '1', stopped: '1' }
    const params: any = {
      pageNum: 1,
      pageSize: 9999,
    }
    if (filters.name) params.jobName = filters.name
    if (filters.status) params.status = statusReverse[filters.status] ?? filters.status
    if (filters.time) {
      params.startTime = `${filters.time} 00:00:00`
      params.endTime = `${filters.time} 23:59:59`
    }

    const res = await fetchJobList(params)
    const rows = this._unwrapRows(res)
    return rows.map((r: any) => this._toUi(r))
  },

  async add(task: TaskForm): Promise<ScheduleTask> {
    // 当前抽屉表单缺少 invokeTarget/cronExpression 等 ABI 必填字段，
    // 暂时保留本地 mock 新增；后续补齐表单字段后可切换为真实接口。
    if (this.useRealApi) {
      const payload = {
        ...this._toPayload(task),
        invokeTarget: 'ryTask.defaultParams()',
        cronExpression: '0 0 9 * * ?',
        misfirePolicy: '1',
        concurrent: '1',
      }
      const res = await addJob(payload)
      if (!this._isOk(res)) throw new Error(res?.message || '新增失败')
      return this._toUi(res?.data ?? {})
    }

    await this._delay(200)
    const newTask: ScheduleTask = {
      id: String(mockNextId++),
      name: task.name,
      freq: task.freq,
      type: task.type,
      status: task.status,
      desc: task.desc,
      creator: '当前用户',
      created: this._now(),
      lastRun: '尚未执行',
    }
    mockTasks.unshift(newTask)
    return newTask
  },

  async update(id: string, task: TaskForm): Promise<void> {
    // 当前抽屉表单缺少 invokeTarget/cronExpression 等 ABI 必填字段，
    // 暂时保留本地 mock 更新；后续补齐表单字段后可切换为真实接口。
    if (this.useRealApi) {
      const payload = {
        ...this._toPayload(task),
        jobId: id,
        invokeTarget: 'ryTask.defaultParams()',
        cronExpression: '0 0 9 * * ?',
        misfirePolicy: '1',
        concurrent: '1',
      }
      const res = await updateJob(payload)
      if (!this._isOk(res)) throw new Error(res?.message || '更新失败')
      return
    }

    await this._delay(200)
    const target = mockTasks.find((t) => t.id === id)
    if (target) {
      target.name = task.name
      target.freq = task.freq
      target.type = task.type
      target.status = task.status
      target.desc = task.desc
    }
  },

  async delete(id: string): Promise<void> {
    if (!this.useRealApi) {
      await this._delay(200)
      mockTasks = mockTasks.filter((t) => t.id !== id)
      return
    }
    const res = await deleteJob(id)
    if (!this._isOk(res)) throw new Error(res?.message || '删除失败')
  },

  async run(id: string): Promise<void> {
    if (!this.useRealApi) {
      await this._delay(200)
      const target = mockTasks.find((t) => t.id === id)
      if (target) {
        target.lastRun = this._now()
      }
      return
    }
    const res = await runJob({ jobId: id })
    if (!this._isOk(res)) throw new Error(res?.message || '执行失败')
  },

  async toggleStatus(id: string, currentStatus: ScheduleTask['status']): Promise<void> {
    if (!this.useRealApi) {
      await this._delay(200)
      const target = mockTasks.find((t) => t.id === id)
      if (target) {
        target.status = currentStatus === 'running' ? 'paused' : 'running'
      }
      return
    }
    const res = await fetchChangeStatus({ recordId: id })
    if (!this._isOk(res)) throw new Error(res?.message || '状态切换失败')
  },
}

let mockNextId = 6
let mockTasks: ScheduleTask[] = [
  {
    id: '1',
    name: '每日用户活跃统计',
    freq: '每天 09:00',
    type: '数据查询',
    status: 'running',
    desc: '统计前一日新老用户日活数据并生成趋势图表',
    creator: '张明',
    created: '2026-05-20 10:00',
    lastRun: '2026-06-05 09:00',
  },
  {
    id: '2',
    name: '周报自动生成',
    freq: '每周一 09:00',
    type: '报告生成',
    status: 'running',
    desc: '汇总上周数据指标，生成 Markdown 周报并推送至邮箱',
    creator: '李婷',
    created: '2026-05-15 14:30',
    lastRun: '2026-06-02 09:00',
  },
  {
    id: '3',
    name: '异常流量告警',
    freq: '每小时',
    type: '告警推送',
    status: 'running',
    desc: '监控接口异常流量，超过阈值自动触发告警通知',
    creator: '张明',
    created: '2026-05-10 09:15',
    lastRun: '2026-06-05 11:00',
  },
  {
    id: '4',
    name: '数据仓库同步',
    freq: '每天 18:00',
    type: '数据同步',
    status: 'paused',
    desc: '将 MySQL 增量数据同步至 PG 分析库',
    creator: '赵阳',
    created: '2026-04-28 16:00',
    lastRun: '2026-05-30 18:00',
  },
  {
    id: '5',
    name: '用户画像刷新',
    freq: '每天 09:00',
    type: '智能分析',
    status: 'stopped',
    desc: '基于最新行为数据刷新用户标签和分群',
    creator: '王磊',
    created: '2026-04-20 11:30',
    lastRun: '2026-05-15 09:00',
  },
]

const statusLabel: Record<string, string> = {
  running: '运行中',
  paused: '已暂停',
  stopped: '已停止',
}

const emptyForm: TaskForm = {
  name: '',
  freq: '',
  type: '数据查询',
  status: 'running',
  desc: '',
}

interface ScheduleTaskDrawerProps {
  open: boolean
  onClose: () => void
}

export function ScheduleTaskDrawer({ open, onClose }: ScheduleTaskDrawerProps) {
  const [tasks, setTasks] = useState<ScheduleTask[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ name: '', status: '', time: '' })
  // 高级筛选：草稿值在点击“查询”前不会生效
  const [advOpen, setAdvOpen] = useState(false)
  const [advDraft, setAdvDraft] = useState({ status: '', time: '' })
  const advRef = useRef<HTMLDivElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<TaskForm>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const hasAdvFilter = filters.status !== '' || filters.time !== ''

  const loadTasks = async () => {
    setLoading(true)
    try {
      const list = await scheduleApi.fetchList(filters)
      setTasks(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadTasks()
    }
  }, [open])

  // 搜索条件变化时防抖刷新
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      loadTasks()
    }, 200)
    return () => clearTimeout(timer)
  }, [filters.name, filters.status, filters.time])

  const stats = useMemo(() => {
    const total = tasks.length
    const running = tasks.filter((t) => t.status === 'running').length
    const paused = tasks.filter((t) => t.status === 'paused').length
    const stopped = tasks.filter((t) => t.status === 'stopped').length
    return { total, running, paused, stopped }
  }, [tasks])

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

  const handleOpenEdit = (task: ScheduleTask) => {
    setEditingId(task.id)
    setForm({
      name: task.name,
      freq: task.freq,
      type: task.type,
      status: task.status,
      desc: task.desc,
    })
    setFormOpen(true)
  }

  const handleCloseEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(false)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.freq) {
      Modal.warning({ title: '提示', content: '请填写任务名称和执行频率' })
      return
    }
    if (editingId) {
      await scheduleApi.update(editingId, form)
    } else {
      await scheduleApi.add(form)
    }
    handleCloseEdit()
    await loadTasks()
  }

  const handleDelete = (id: string) => {
    setDeleteId(id)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    await scheduleApi.delete(deleteId)
    setDeleteId(null)
    await loadTasks()
  }

  const handleRun = async (id: string) => {
    await scheduleApi.run(id)
    await loadTasks()
  }

  const handleToggleStatus = async (task: ScheduleTask) => {
    await scheduleApi.toggleStatus(task.id, task.status)
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

          {/* 搜索 + 高级筛选 */}
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

          {/* 编辑表单 */}
          {formOpen && (
            <div className="schedule-edit-panel">
              <div className="schedule-edit-row">
                <div className="schedule-edit-field">
                  <label>任务名称 *</label>
                  <input
                    type="text"
                    value={form.name}
                    placeholder="例如：每日用户活跃统计"
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="schedule-edit-field">
                  <label>执行频率 *</label>
                  <Select
                    className="schedule-form-select"
                    popupClassName="schedule-form-select-popup"
                    value={form.freq}
                    options={freqOptions}
                    onChange={(value) => setForm((f) => ({ ...f, freq: value }))}
                    placeholder="请选择"
                  />
                </div>
                <div className="schedule-edit-field">
                  <label>任务类型</label>
                  <Select
                    className="schedule-form-select"
                    popupClassName="schedule-form-select-popup"
                    value={form.type}
                    options={typeOptions}
                    onChange={(value) => setForm((f) => ({ ...f, type: value }))}
                  />
                </div>
                <div className="schedule-edit-field">
                  <label>状态</label>
                  <Select
                    className="schedule-form-select"
                    popupClassName="schedule-form-select-popup"
                    value={form.status}
                    options={formStatusOptions}
                    onChange={(value) => setForm((f) => ({ ...f, status: value as ScheduleTask['status'] }))}
                  />
                </div>
                <div className="schedule-edit-field full">
                  <label>任务描述 / Prompt</label>
                  <textarea
                    value={form.desc}
                    placeholder="描述任务执行内容或发送给 AI 的 Prompt…"
                    onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                  />
                </div>
              </div>
              <div className="schedule-edit-actions">
                <button type="button" className="schedule-edit-cancel" onClick={handleCloseEdit}>
                  取消
                </button>
                <button type="button" className="schedule-edit-save" onClick={handleSave}>
                  保存
                </button>
              </div>
            </div>
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
                      title={task.status === 'running' ? '点击暂停' : '点击启用'}
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
                    <button type="button" className="schedule-task-action" onClick={() => handleOpenEdit(task)}>
                      <EditOutlined />
                      编辑
                    </button>
                    <button
                      type="button"
                      className="schedule-task-action"
                      onClick={() => handleToggleStatus(task)}
                    >
                      {task.status === 'running' ? <PauseOutlined /> : <PlayCircleOutlined />}
                      {task.status === 'running' ? '暂停' : '启用'}
                    </button>
                    <button type="button" className="schedule-task-action run" onClick={() => handleRun(task.id)}>
                      <ReloadOutlined />
                      执行
                    </button>
                    <button
                      type="button"
                      className="schedule-task-action danger"
                      onClick={() => handleDelete(task.id)}
                    >
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
        <p>
          确定要删除定时任务 “{tasks.find((t) => t.id === deleteId)?.name || ''}” 吗？此操作不可恢复。
        </p>
      </Modal>
    </>
  )
}
