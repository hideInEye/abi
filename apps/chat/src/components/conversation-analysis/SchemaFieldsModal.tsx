import React, { useMemo, useState } from 'react'
import { Drawer, Input, Spin, Empty, Tag, Select } from 'antd'
import { SearchOutlined, DatabaseOutlined, CloseOutlined, PlusOutlined, MinusOutlined } from '@ant-design/icons'

export interface SchemaField {
  name: string           // originName/fieldName - 字段名
  type: string           // fieldType - 原始类型
  semantic: 'pk' | 'date' | 'dim' | 'metric'
  semLabel: string
  description?: string   // fieldDesc - 描述
  tableName?: string     // 所属表名
  tableDesc?: string     // 表描述/中文名
  bizName?: string       // 中文名称
  alias?: string         // 别名
}

export interface SchemaTable {
  schemaId: number | string
  bizName: string
  techName?: string
  description?: string
  fields: SchemaField[]
  loading?: boolean
}

interface Props {
  open: boolean
  tables: SchemaTable[]
  onClose: () => void
}

const SEM_TAG_CONFIG: Record<string, { color: string; bg: string }> = {
  pk:     { color: '#5b7cf7', bg: 'rgba(91,124,247,0.12)' },
  date:   { color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  dim:    { color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  metric: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
}

/** 将扁平字段列表按 tableName 分组 */
function groupFieldsByTable(fields: SchemaField[]): { tableName: string; tableDesc: string; fields: SchemaField[] }[] {
  const map = new Map<string, { tableDesc: string; fields: SchemaField[] }>()
  fields.forEach(f => {
    const key = f.tableName || '未命名表'
    if (!map.has(key)) {
      map.set(key, { tableDesc: f.tableDesc || '', fields: [] })
    }
    map.get(key)!.fields.push(f)
  })
  return Array.from(map.entries()).map(([tableName, v]) => ({ tableName, tableDesc: v.tableDesc, fields: v.fields }))
}

export default function SchemaFieldsModal({ open, tables, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('')

  const filterOptions = [
    { key: '', label: '全部类型' },
    { key: 'pk', label: '主键' },
    { key: 'date', label: '日期' },
    { key: 'dim', label: '维度' },
    { key: 'metric', label: '指标' },
  ]

  // 合并所有表的字段，按物理表分组
  const allFields = useMemo(() => tables.flatMap(t => t.fields), [tables])
  const tableGroups = useMemo(() => groupFieldsByTable(allFields), [allFields])

  // 统计
  const totalTables = tableGroups.length
  const totalFields = allFields.length
  const dimFields = allFields.filter(f => f.semantic === 'dim').length
  const metricFields = allFields.filter(f => f.semantic === 'metric').length

  // 过滤
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tableGroups.map(g => {
      let fields = g.fields
      if (filterType) fields = fields.filter(f => f.semantic === filterType)
      if (q) {
        const tableMatch = g.tableName.toLowerCase().includes(q) || g.tableDesc.toLowerCase().includes(q)
        if (!tableMatch) fields = fields.filter(f => f.name.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q))
        if (fields.length === 0 && !tableMatch) return null
      }
      if (fields.length === 0) return null
      return { ...g, fields }
    }).filter(Boolean) as typeof tableGroups
  }, [tableGroups, search, filterType])

  const totalLoading = tables.some(t => t.loading)

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      width={720}
      closable={false}
      styles={{ body: { padding: 0, overflowY: 'auto' } }}
      rootStyle={{ position: 'absolute' }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '18px 24px',
        borderBottom: '1px solid #eef0f4', background: 'rgba(91,124,247,0.03)',
      }}>
        <DatabaseOutlined style={{ fontSize: 20, color: '#5b7cf7' }} />
        <span style={{ fontSize: 16, fontWeight: 700, flex: 1, color: '#1f2937' }}>数据语义</span>
        <Tag color="blue" style={{ marginRight: 0, fontWeight: 600 }}>Schema</Tag>
        <CloseOutlined style={{ cursor: 'pointer', color: '#9ca3af', fontSize: 14 }} onClick={onClose} />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 0, padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
        <StatItem label="数据表" value={totalTables} color="#5b7cf7" />
        <StatItem label="总字段" value={totalFields} color="#059669" />
        <StatItem label="维度字段" value={dimFields} color="#6b7280" />
        <StatItem label="指标字段" value={metricFields} color="#dc2626" />
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid #f3f4f6' }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
          placeholder="搜索表名或字段..."
          allowClear
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <Select
          value={filterType}
          onChange={v => setFilterType(v)}
          style={{ width: 120 }}
          options={filterOptions.map(opt => ({ value: opt.key, label: opt.label }))}
        />
      </div>

      {/* Table groups */}
      <div style={{ padding: '16px 24px 24px' }}>
        {totalLoading && <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>}
        {!totalLoading && filteredGroups.length === 0 && (
          <Empty description="暂无匹配的表或字段" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 32 }} />
        )}
        {!totalLoading && filteredGroups.map(g => (
          <TableGroupCard key={g.tableName} tableName={g.tableName} tableDesc={g.tableDesc} fields={g.fields} />
        ))}
      </div>
    </Drawer>
  )
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding: '8px 0', borderRadius: 8, background: `${color}08`,
      margin: '0 4px',
    }}>
      <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

function TableGroupCard({ tableName, tableDesc, fields }: { tableName: string; tableDesc: string; fields: SchemaField[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  const toggle = (idx: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  return (
    <div style={{
      background: '#fff', border: '1px solid #eef0f4',
      borderRadius: 12, overflow: 'hidden', marginBottom: 16,
    }}>
      {/* Table header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
        background: 'rgba(91,124,247,0.03)', borderBottom: '1px solid #f3f4f6',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(91,124,247,0.12), rgba(139,92,246,0.08))',
        }}>
          <DatabaseOutlined style={{ fontSize: 16, color: '#5b7cf7' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', fontFamily: 'monospace' }}>{tableName}</div>
          {tableDesc && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{tableDesc}</div>}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 600, color: '#6b7280', background: 'rgba(130,140,200,0.08)',
          padding: '4px 12px', borderRadius: 12, flexShrink: 0,
        }}>
          {fields.length} 字段
        </div>
      </div>

      {/* Fields table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 40, textAlign: 'center' }}></th>
            <th style={thStyle}>字段名</th>
            <th style={thStyle}>原始类型</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>语义类型</th>
            <th style={thStyle}>语义说明</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f, i) => {
            const isExpanded = expanded.has(i)
            return (
              <React.Fragment key={i}>
                <tr style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(91,124,247,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ ...tdStyle, textAlign: 'center', verticalAlign: 'middle' }}>
                    <div
                      onClick={() => toggle(i)}
                      style={{
                        width: 20, height: 20, borderRadius: 6,
                        border: '1px solid #c7d2fe', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: '#5b7cf7', fontSize: 10,
                        background: isExpanded ? 'rgba(91,124,247,0.12)' : '#fff',
                        transition: 'all 0.2s',
                      }}
                    >
                      {isExpanded ? <MinusOutlined /> : <PlusOutlined />}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 600, color: '#1f2937' }}>{f.name}</td>
                  <td style={tdStyle}>
                    <span style={{
                      fontFamily: 'monospace', fontSize: 11.5, color: '#6b7280',
                      background: 'rgba(130,140,200,0.08)', padding: '2px 8px', borderRadius: 4, display: 'inline-block',
                    }}>{f.type}</span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <SemTag semantic={f.semantic} label={f.semLabel} />
                  </td>
                  <td style={{ ...tdStyle, color: '#6b7280' }}>{f.bizName || '—'}</td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={5} style={{ padding: 0, borderBottom: '1px solid #f8f9fa' }}>
                      <div style={{
                        margin: '4px 16px 16px',
                        padding: '16px 18px',
                        background: '#FAFAFA',
                        borderRadius: 10,
                        border: '1px solid #e5e7eb',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>
                          字段详细信息
                        </div>
                        <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #d1d5db' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, background: '#FAFAFA' }}>
                            <tbody>
                              <tr>
                                <td style={{ ...detailLabelStyle, borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db' }}>别名</td>
                                <td style={{ ...detailValueStyle, borderBottom: '1px solid #d1d5db' }}>{f.alias || '—'}</td>
                              </tr>
                              <tr>
                                <td style={{ ...detailLabelStyle, borderRight: '1px solid #d1d5db' }}>字段描述</td>
                                <td style={detailValueStyle}>{f.description || '—'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SemTag({ semantic, label }: { semantic: string; label: string }) {
  const cfg = SEM_TAG_CONFIG[semantic] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 12, fontSize: 11.5, fontWeight: 700,
      background: cfg.bg, color: cfg.color,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
      {label}
    </span>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#5b7cf7',
  textAlign: 'left', borderBottom: '1px solid #f3f4f6',
  background: 'rgba(91,124,247,0.02)',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px', fontSize: 13, color: '#4b5563',
  borderBottom: '1px solid #f8f9fa',
}

const detailLabelStyle: React.CSSProperties = {
  width: 90, padding: '12px 16px', color: '#4b5563', fontWeight: 600,
  background: '#FAFAFA', verticalAlign: 'top',
}

const detailValueStyle: React.CSSProperties = {
  padding: '12px 16px', color: '#374151',
  background: '#FAFAFA', lineHeight: 1.6,
}