import { MATCH_METHOD_LABELS, MATCH_TARGET_LABELS, SMART_HELPERS } from '../constants'
import styles from '../semantic-list.module.scss'
import type { SemanticMatchMethod, SemanticMatchTarget } from '../types'

interface SmartMatchHelperProps {
  readonly method: SemanticMatchMethod
  readonly onApply: (value: string) => void
  readonly target: SemanticMatchTarget
}

export function SmartMatchHelper({ method, onApply, target }: SmartMatchHelperProps) {
  const helper = SMART_HELPERS[target][method]

  return (
    <section
      aria-label="智能提示"
      className={styles.smartHelper}
    >
      <div className={styles.smartHelperHeader}>
        <span
          aria-hidden="true"
          className={styles.smartHelperDot}
        />
        <span className={styles.smartHelperTitle}>
          智能提示 · {MATCH_TARGET_LABELS[target]} + {MATCH_METHOD_LABELS[method]}
        </span>
        <span className={styles.smartHelperDescription}>
          {helper.description}
          {helper.examples.length ? '，点击下方示例可直接填入' : ''}
        </span>
      </div>
      <div className={styles.smartHelperList}>
        {helper.examples.length ? (
          helper.examples.map(example => (
            <button
              className={styles.smartHelperItem}
              key={`${example.label}-${example.value}`}
              title="点击填入"
              type="button"
              onClick={() => onApply(example.value)}
            >
              <span className={styles.smartHelperLabel}>{example.label}</span>
              <code className={styles.smartHelperValue}>{example.value}</code>
              <span className={styles.smartHelperAction}>填入</span>
            </button>
          ))
        ) : (
          <div className={styles.smartHelperEmpty}>当前组合暂无示例，可按业务规则填写匹配内容。</div>
        )}
      </div>
    </section>
  )
}
