import { BgColorsOutlined, CloseOutlined } from '@ant-design/icons'
import { Collapse, ColorPicker, ConfigProvider, Drawer, Segmented, Select, Slider } from 'antd'
import zhCN from 'antd/es/locale/zh_CN'
import { useRef, type ReactNode } from 'react'

import { type ThemeConfig, type ThemeId } from '../../../theme'
import styles from './ThemeCustomizer.module.css'

/** 字族候选（覆盖常见中英文与等宽场景） */
const FONT_FAMILIES = [
  { label: '默认', value: "'Helvetica Neue', Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" },
  { label: '微软雅黑', value: "'Microsoft YaHei', '微软雅黑', sans-serif" },
  { label: '苹方', value: "'PingFang SC', -apple-system, sans-serif" },
  { label: '思源黑体', value: "'Source Han Sans SC', 'Noto Sans SC', sans-serif" },
  { label: '宋体', value: "'Songti SC', SimSun, serif" },
  { label: '楷体', value: "'Kaiti SC', KaiTi, serif" },
  { label: '等宽', value: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace" },
]

const FONT_WEIGHTS = [
  { label: '细', value: 300 },
  { label: '常规', value: 400 },
  { label: '中', value: 500 },
  { label: '半粗', value: 600 },
  { label: '粗', value: 700 },
]

const PRESET_LABELS: Record<ThemeId, string> = { blue: '蓝色系', light: '白色系', dark: '黑色系' }
const PRESET_SWATCH: Record<ThemeId, string> = { blue: 'linear-gradient(135deg,#5b7cf7,#8b5cf6)', light: 'linear-gradient(135deg,#fff,#e8ecf5)', dark: 'linear-gradient(135deg,#2a2e3c,#15171f)' }
const PRESET_IDS: ThemeId[] = ['blue', 'light', 'dark']
const MAX_PALETTE = 8

/** antd ColorPicker 值 → CSS 颜色串（无透明用 hex，含透明用 rgba） */
function colorToCss(c: { toRgb: () => { a: number }; toHexString: () => string; toRgbString: () => string }): string {
  return c.toRgb().a === 1 ? c.toHexString() : c.toRgbString()
}

/** 常规行：标签定宽左对齐，控件占满剩余宽度，纵向整齐成列 */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <div className={styles.control}>{children}</div>
    </div>
  )
}

/** 取色行：色块旁常驻显示当前值，改没改一眼可见 */
function ColorRow({ label, value, getPopupContainer, onChange }: { label: string; value: string; getPopupContainer: () => HTMLElement; onChange: (css: string) => void }) {
  return (
    <Row label={label}>
      <div className={styles.colorControl}>
        <ColorPicker size="small" value={value} getPopupContainer={getPopupContainer} onChange={(c) => onChange(colorToCss(c))} />
        <span className={styles.hex} title={value}>
          {value.replace(/,\s+/g, ',')}
        </span>
      </div>
    </Row>
  )
}

/** 滑杆行：右侧常驻数值，免去拖拽时只看 tooltip */
function SliderRow({ label, min, max, value, unit, onChange }: { label: string; min: number; max: number; value: number; unit: string; onChange: (v: number) => void }) {
  return (
    <Row label={label}>
      <div className={styles.sliderControl}>
        <Slider className={styles.slider} min={min} max={max} step={1} value={value} onChange={onChange} />
        <span className={styles.metric}>
          {value}
          {unit} 
        </span>
      </div>
    </Row>
  )
}

export interface ThemeCustomizerProps {
  open: boolean
  /** 面板表单当前值（完整配置，由预设基准 + override 合成） */
  value: ThemeConfig
  /** 当前预设基准（决定预设 chip 高亮） */
  preset: ThemeId
  saving?: boolean
  getContainer: () => HTMLElement
  onChange: (next: ThemeConfig) => void
  onPresetChange: (id: ThemeId) => void
  onSave: () => void
  onReset: () => void
  onClose: () => void
}

/** 外观自定义弹窗：挂载在悬浮窗面板内（abi 数据源编辑弹窗同款形态：右侧滑出、带遮罩、宽度随视口自适应），背景/标题栏/字体/图表四维，保存回传后端 */
export default function ThemeCustomizer({ open, value, preset, saving, getContainer, onChange, onPresetChange, onSave, onReset, onClose }: ThemeCustomizerProps) {
  // 取色/下拉弹层挂到抽屉内容节点：跟随抽屉滚动，也不会漂回面板其它位置
  const popupHostRef = useRef<HTMLDivElement>(null)
  const popupContainer = () => popupHostRef.current as HTMLElement

  const patchBg = (p: Partial<ThemeConfig['background']>) => onChange({ ...value, background: { ...value.background, ...p } })
  const patchHeader = (p: Partial<ThemeConfig['titleBar']>) => onChange({ ...value, titleBar: { ...value.titleBar, ...p } })
  const patchFont = (p: Partial<ThemeConfig['font']>) => onChange({ ...value, font: { ...value.font, ...p } })
  const patchChart = (p: Partial<ThemeConfig['chart']>) => onChange({ ...value, chart: { ...value.chart, ...p } })
  const patchMessage = (p: Partial<ThemeConfig['message']>) => onChange({ ...value, message: { ...value.message, ...p } })

  const bgSection = (
    <div className={styles.section}>
      <Row label="背景类型">
        <Segmented
          size="small"
          block
          value={value.background.type}
          onChange={(v) => patchBg({ type: v as 'solid' | 'gradient' })}
          options={[
            { label: '纯色', value: 'solid' },
            { label: '渐变', value: 'gradient' },
          ]}
        />
      </Row>
      <ColorRow label="背景色" value={value.background.color} getPopupContainer={popupContainer} onChange={(css) => patchBg({ color: css })} />
      {value.background.type === 'gradient' && (
        <>
          <ColorRow label="渐变色" value={value.background.color2} getPopupContainer={popupContainer} onChange={(css) => patchBg({ color2: css })} />
          <SliderRow label="角度" min={0} max={360} value={value.background.angle} unit="°" onChange={(v) => patchBg({ angle: v })} />
        </>
      )}
    </div>
  )

  const headerSection = (
    <div className={styles.section}>
      <ColorRow label="标题栏底色" value={value.titleBar.bg} getPopupContainer={popupContainer} onChange={(css) => patchHeader({ bg: css })} />
      <ColorRow label="标题栏文字" value={value.titleBar.text} getPopupContainer={popupContainer} onChange={(css) => patchHeader({ text: css })} />
    </div>
  )

  const fontSection = (
    <div className={styles.section}>
      <Row label="字族">
        <Select className={styles.select} size="small" value={value.font.family} options={FONT_FAMILIES} getPopupContainer={popupContainer} onChange={(v) => patchFont({ family: v })} />
      </Row>
      <SliderRow label="字号" min={12} max={18} value={value.font.size} unit="px" onChange={(v) => patchFont({ size: v })} />
      <ColorRow label="文字颜色" value={value.font.color} getPopupContainer={popupContainer} onChange={(css) => patchFont({ color: css })} />
      <Row label="字重">
        <Segmented size="small" block value={value.font.weight} options={FONT_WEIGHTS} onChange={(v) => patchFont({ weight: v as number })} />
      </Row>
    </div>
  )

  const messageSection = (
    <div className={styles.section}>
      <ColorRow label="AI 卡片底色" value={value.message.cardBg} getPopupContainer={popupContainer} onChange={(css) => patchMessage({ cardBg: css })} />
      <ColorRow label="AI 文字颜色" value={value.message.textColor} getPopupContainer={popupContainer} onChange={(css) => patchMessage({ textColor: css })} />
      <ColorRow label="用户气泡色" value={value.message.bubbleColor} getPopupContainer={popupContainer} onChange={(css) => patchMessage({ bubbleColor: css })} />
    </div>
  )

  const chartSection = (
    <div className={styles.section}>
      <div className={styles.paletteLabel}>系列配色板</div>
      <div className={styles.palette}>
        {value.chart.palette.map((c, i) => (
          <div key={`${c}-${i}`} className={styles.paletteCell}>
            <ColorPicker
              size="small"
              value={c}
              getPopupContainer={popupContainer}
              onChange={(cc) => {
                const next = [...value.chart.palette]
                next[i] = colorToCss(cc)
                patchChart({ palette: next })
              }}
            >
              <span className={styles.paletteSwatch} style={{ background: c }} title={c} />
            </ColorPicker>
            {value.chart.palette.length > 1 && (
              <button type="button" className={styles.paletteDel} onClick={() => patchChart({ palette: value.chart.palette.filter((_, j) => j !== i) })} aria-label="移除该色">
                ×
              </button>
            )}
          </div>
        ))}
        {value.chart.palette.length < MAX_PALETTE && (
          <button type="button" className={styles.paletteAdd} onClick={() => patchChart({ palette: [...value.chart.palette, '#5B7CF7'] })} aria-label="新增一色">
            +
          </button>
        )}
      </div>
      <ColorRow label="图表文字" value={value.chart.textColor} getPopupContainer={popupContainer} onChange={(css) => patchChart({ textColor: css })} />
      <Row label="图表字族">
        <Select className={styles.select} size="small" value={value.chart.fontFamily} options={FONT_FAMILIES} getPopupContainer={popupContainer} onChange={(v) => patchChart({ fontFamily: v })} />
      </Row>
      <SliderRow label="图表字号" min={10} max={16} value={value.chart.fontSize} unit="px" onChange={(v) => patchChart({ fontSize: v })} />
    </div>
  )

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        components: { Collapse: { headerBg: 'transparent', contentBg: 'transparent', contentPadding: 0 } },
      }}
    >
      <Drawer
        open={open}
        onClose={onClose}
        getContainer={getContainer}
        /* 抽屉嵌在面板内：根节点改绝对定位，否则 rc-drawer 默认 fixed 会铺满视口 */
        rootStyle={{ position: 'absolute' }}
        /* 同数据源编辑弹窗：右侧滑出、带遮罩；宽度按面板视口自适应（约六成、上限 736、下限 320），窄悬浮窗不铺满 */
        placement="right"
        width="clamp(320px, 60%, 736px)"
        /* 同 abi CommonDrawer：关闭按钮放 extra，不用 antd 默认 closable */
        closable={false}
        closeIcon={null}
        title={
          <div className={styles.drawerTitle}>
            <span className={styles.drawerTitleIcon}>
              <BgColorsOutlined />
            </span>
            <span className={styles.drawerTitleText}>外观自定义</span>
          </div>
        }
        extra={<CloseOutlined className={styles.drawerClose} onClick={onClose} />}
        /* 弹窗配色只由 .drawer 的局部变量决定，与面板自定义色完全隔离 */
        rootClassName={styles.drawer}
        styles={{
          body: { padding: '16px 28px 24px', overflowY: 'auto' },
          footer: { padding: 0 },
        }}
        footer={
          <div className={styles.footer}>
            <button type="button" className={styles.resetBtn} onClick={onReset}>
              恢复默认
            </button>
            <button type="button" className={styles.saveBtn} disabled={saving} onClick={onSave}>
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        }
      >
        <div ref={popupHostRef} className={styles.body}>
          <div className={styles.presetRow}>
            {PRESET_IDS.map((id) => (
              <button type="button" key={id} className={`${styles.presetChip} ${preset === id ? styles.presetChipActive : ''}`} onClick={() => onPresetChange(id)}>
                <i className={styles.presetDot} style={{ background: PRESET_SWATCH[id] }} />
                {PRESET_LABELS[id]}
              </button>
            ))}
          </div>
          <p className={styles.hint}>预设决定整体明暗与主色，下方各项在预设基础上微调。</p>
          <Collapse
            ghost
            defaultActiveKey={['bg']}
            items={[
              { key: 'bg', label: '页面背景', children: bgSection },
              { key: 'header', label: '标题栏', children: headerSection },
              { key: 'message', label: '对话消息', children: messageSection },
              { key: 'font', label: '字体', children: fontSection },
              { key: 'chart', label: '图表样式', children: chartSection },
            ]}
          />
        </div>
      </Drawer>
    </ConfigProvider>
  )
}
