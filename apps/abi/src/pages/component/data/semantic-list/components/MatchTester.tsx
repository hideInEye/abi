import { Button, Input } from 'antd'

import styles from '../semantic-list.module.scss'
import type { SemanticMatchResult } from '../types'

interface MatchTesterProps {
  readonly note: string
  readonly onChange: (value: string) => void
  readonly onTest: () => void
  readonly result: SemanticMatchResult | null
  readonly text: string
}

export function MatchTester({ note, onChange, onTest, result, text }: MatchTesterProps) {
  return (
    <section
      aria-label="匹配测试"
      className={styles.matchTester}
    >
      <div className={styles.matchTesterHeader}>
        <span>匹配测试</span>
        <span>{note}</span>
      </div>
      <div className={styles.matchTesterBody}>
        <div className="flex items-center gap-2">
          <Input
            aria-label="待匹配文本"
            placeholder="输入一段待匹配文本"
            value={text}
            onChange={event => onChange(event.target.value)}
            onPressEnter={onTest}
          />
          <Button
            type="default"
            onClick={onTest}
          >
            测试
          </Button>
        </div>
        {result ? (
          <div
            className={result.status === 'success' ? styles.matchResultSuccess : styles.matchResultFailure}
            role={result.status === 'success' ? 'status' : 'alert'}
          >
            {result.message}
          </div>
        ) : null}
      </div>
    </section>
  )
}
