import { ApartmentOutlined, ArrowRightOutlined, TagsOutlined } from '@ant-design/icons'

import styles from '../data-dictionary.module.scss'

export type DictionaryMode = 'data' | 'type'

interface DictionaryModeHeaderProps {
  readonly activeMode: DictionaryMode
  readonly onChange: (mode: DictionaryMode) => void
}

const MODES = [
  {
    description: '定义名称与类型',
    icon: <ApartmentOutlined />,
    key: 'type' as const,
    label: '字典类别',
    step: '01'
  },
  {
    description: '维护标签与键值',
    icon: <TagsOutlined />,
    key: 'data' as const,
    label: '字典数据',
    step: '02'
  }
]

export function DictionaryModeHeader({ activeMode, onChange }: DictionaryModeHeaderProps) {
  return (
    <header className={styles.modeHeader}>
      <div className={styles.modeHeaderCopy}>
        <span className={styles.modeEyebrow}>DICTIONARY REGISTRY</span>
        <div className={styles.modeTitleRow}>
          <h1>系统字典</h1>
          <span>先定义类别，再维护类别下的业务键值</span>
        </div>
      </div>
      <nav
        aria-label="系统字典视图"
        className={styles.modeSteps}
        role="tablist"
      >
        {MODES.map((mode, index) => (
          <div
            className={styles.modeStepGroup}
            key={mode.key}
          >
            {index > 0 ? (
              <ArrowRightOutlined
                aria-hidden="true"
                className={styles.modeStepArrow}
              />
            ) : null}
            <button
              aria-selected={activeMode === mode.key}
              className={`${styles.modeStep} ${activeMode === mode.key ? styles.modeStepActive : ''}`}
              role="tab"
              type="button"
              onClick={() => onChange(mode.key)}
            >
              <span className={styles.modeStepIndex}>{mode.step}</span>
              <span className={styles.modeStepIcon}>{mode.icon}</span>
              <span className={styles.modeStepText}>
                <strong>{mode.label}</strong>
                <small>{mode.description}</small>
              </span>
            </button>
          </div>
        ))}
      </nav>
    </header>
  )
}
