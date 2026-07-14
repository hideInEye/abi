import { useEffect, useMemo, useState } from 'react'
import { Popover, Input, Empty, Tag } from 'antd'
import {
  AppstoreOutlined,
  LineChartOutlined,
  PieChartOutlined,
  BarChartOutlined,
  RadarChartOutlined,
  DotChartOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  CHART_CATEGORIES,
  ALL_FAMILIES,
  ALL_CHART_TYPES,
  getChartCategory,
  getChartFamily,
  type ChartTypeItem,
  type ChartFamily,
} from './chartTypeCatalog'

interface Props {
  open: boolean
  /** 当前选中的图表类型 value */
  value?: string
  /** 显隐变化（Popover 受控） */
  onOpenChange: (open: boolean) => void
  onSelect: (value: string) => void
  /** 触发浮层的元素（如按钮） */
  children: React.ReactElement
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  all: <AppstoreOutlined />,
  trend: <LineChartOutlined />,
  proportion: <PieChartOutlined />,
  compare: <BarChartOutlined />,
  evaluate: <RadarChartOutlined />,
  relation: <DotChartOutlined />,
}

const ChartTypeModal: React.FC<Props> = ({ open, value, onOpenChange, onSelect, children }) => {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [activeFamily, setActiveFamily] = useState<string>('all')
  const [keyword, setKeyword] = useState('')

  // 打开时定位到当前图表类型所属分类与大类
  useEffect(() => {
    if (!open) return
    setKeyword('')
    setActiveCategory(getChartCategory(value)?.key || 'all')
    setActiveFamily(getChartFamily(value)?.key || 'all')
  }, [open, value])

  // 当前分类下的大类集合（二级）
  const familiesInCategory: ChartFamily[] = useMemo(() => {
    if (activeCategory === 'all') return ALL_FAMILIES
    return CHART_CATEGORIES.find((c) => c.key === activeCategory)?.families || []
  }, [activeCategory])

  const familyRail = useMemo(
    () => [{ key: 'all', label: '所有' }, ...familiesInCategory.map((f) => ({ key: f.key, label: f.label }))],
    [familiesInCategory],
  )

  // 右侧卡片（三级）：搜索优先，其次按分类 + 大类过滤
  const cards: ChartTypeItem[] = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    if (kw) {
      return ALL_CHART_TYPES.filter(
        (i) => i.label.toLowerCase().includes(kw) || i.enName.toLowerCase().includes(kw),
      )
    }
    const families =
      activeFamily === 'all' ? familiesInCategory : familiesInCategory.filter((f) => f.key === activeFamily)
    return families.flatMap((f) => f.items)
  }, [keyword, familiesInCategory, activeFamily])

  const handleSelect = (item: ChartTypeItem) => {
    onSelect(item.value)
    onOpenChange(false)
  }

  const categoryRail = [{ key: 'all', label: '全部' }, ...CHART_CATEGORIES.map((c) => ({ key: c.key, label: c.label }))]

  const panel = (
    <div className="flex overflow-hidden rounded-xl" style={{ width: '25rem', height: '28rem' }}>
      {/* 一级：语义分类（图标栏） */}
      <div className="shrink-0 overflow-y-auto border-r border-[#f0f0f0] py-2" style={{ width: '4.5rem' }}>
        {categoryRail.map((cat) => {
          const active = !keyword && activeCategory === cat.key
          return (
            <div
              key={cat.key}
              onClick={() => {
                setKeyword('')
                setActiveCategory(cat.key)
                setActiveFamily('all')
              }}
              className={`flex flex-col items-center gap-0.5 py-2 cursor-pointer text-[0.625rem] leading-tight transition-colors ${
                active ? 'text-[#3470f6] bg-[#eef3ff]' : 'text-[#666] hover:text-[#3470f6] hover:bg-[#f7f9fc]'
              }`}
            >
              <span className="text-[0.9375rem]">{CATEGORY_ICONS[cat.key]}</span>
              <span className="text-center">{cat.label}</span>
            </div>
          )
        })}
      </div>

      {/* 二级：图表大类（文字导航） */}
      <div className="shrink-0 overflow-y-auto border-r border-[#f0f0f0] py-2" style={{ width: '5.25rem' }}>
        {familyRail.map((f) => {
          const active = !keyword && activeFamily === f.key
          return (
            <div
              key={f.key}
              onClick={() => {
                setKeyword('')
                setActiveFamily(f.key)
              }}
              className={`px-1 py-2 text-[13px] text-center cursor-pointer transition-colors ${
                active
                  ? 'text-[#3470f6] bg-[#eef3ff] font-medium'
                  : 'text-[#666] hover:text-[#3470f6] hover:bg-[#f7f9fc]'
              }`}
            >
              {f.label}
            </div>
          )
        })}
      </div>

      {/* 三级：搜索 + 变体卡片（单列窄卡，可上下滚动） */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#fbfcfe]">
        <div className="p-2">
          <Input
            allowClear
            size="small"
            prefix={<SearchOutlined className="text-[#bbb]" />}
            placeholder="搜索图表"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {cards.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配图表" className="mt-10" />
          ) : (
            <div className="flex flex-col gap-2">
              {cards.map((item) => {
                const current = value === item.value
                return (
                  <div
                    key={item.value}
                    onClick={() => handleSelect(item)}
                    className={`rounded-lg border overflow-hidden cursor-pointer transition-all ${
                      current
                        ? 'border-[#3470f6] shadow-[0_2px_8px_rgba(52,112,246,0.15)]'
                        : 'border-[#eef0f4] hover:border-[#c3d4fb] hover:shadow-[0_2px_10px_rgba(52,112,246,0.08)]'
                    }`}
                  >
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-white border-b border-[#f2f3f5]">
                      <span className="text-[13px] font-medium text-[#1f2733] truncate">{item.label}</span>
                      {current ? (
                        <Tag color="blue" className="!m-0 !mr-0 !px-1 !leading-4 !text-[11px]">当前</Tag>
                      ) : item.supported ? (
                        <Tag color="green" className="!m-0 !mr-0 !px-1 !leading-4 !text-[11px]">可用</Tag>
                      ) : (
                        <Tag className="!m-0 !mr-0 !px-1 !leading-4 !text-[11px] !text-[#999] !bg-[#f5f5f5] !border-[#eee]">
                          即将
                        </Tag>
                      )}
                    </div>
                    <div className="bg-white px-4 py-2">
                      <img
                        src={item.thumbnail}
                        alt={item.label}
                        className="block w-full h-auto object-contain rounded"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      trigger="click"
      placement="rightTop"
      arrow={false}
      content={panel}
      overlayInnerStyle={{ padding: 0, borderRadius: 12, overflow: 'hidden' }}
      destroyTooltipOnHide
    >
      {children}
    </Popover>
  )
}

export default ChartTypeModal
