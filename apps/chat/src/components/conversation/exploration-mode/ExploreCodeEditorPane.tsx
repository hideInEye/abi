import { CheckOutlined, CodeOutlined, CopyOutlined } from '@ant-design/icons'
import { json } from '@codemirror/lang-json'
import { sql } from '@codemirror/lang-sql'
import CodeMirror from '@uiw/react-codemirror'
import { Button, message } from 'antd'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import type { ExploreCodeLanguage } from './ExploreCodeBlock'
import { CollapseIcon } from './ExplorePreviewPane'
import styles from './styles.module.css'

interface ExploreCodeEditorPaneProps {
  code: string
  language: ExploreCodeLanguage
  /** 代码所属步骤标题，展示在面板标题处。 */
  title?: string
  onClose: () => void
}

/** 代码编辑右侧面板：与工作室共用同一套分屏壳，CodeMirror 支持就地编辑与复制。 */
const ExploreCodeEditorPane: React.FC<ExploreCodeEditorPaneProps> = ({ code, language, title, onClose }) => {
  const [value, setValue] = useState(code)
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<number>()
  useEffect(() => () => window.clearTimeout(copyTimerRef.current), [])

  const extensions = useMemo(() => {
    if (language === 'sql') return [sql()]
    if (language === 'json') return [json()]
    return []
  }, [language])

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = value
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(textarea)
        if (!ok) throw new Error('copy failed')
      }
      setCopied(true)
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      message.error('复制失败')
    }
  }

  return (
    <aside className={styles.pane}>
      <div className={styles.paneHeader}>
        <div className={styles.paneTitle}>
          <CodeOutlined />
          <span className={styles.paneTitleText}>代码编辑{title ? ` · ${title}` : ''}</span>
          <span className={styles.codeEditorLang}>{language}</span>
        </div>
        <div className={styles.paneHeaderActions}>
          <Button
            type="text"
            className={styles.paneCloseButton}
            icon={copied ? <CheckOutlined style={{ color: 'var(--accent, #5b7cf7)' }} /> : <CopyOutlined />}
            title="复制代码"
            aria-label="复制代码"
            onClick={handleCopy}
          />
          <Button
            type="text"
            className={styles.paneCloseButton}
            icon={<CollapseIcon />}
            title="收起编辑"
            aria-label="收起编辑"
            onClick={onClose}
          />
        </div>
      </div>

      <div className={styles.codeEditorBody}>
        <CodeMirror
          value={value}
          onChange={setValue}
          extensions={extensions}
          theme="light"
          height="100%"
          basicSetup={{ foldGutter: true, autocompletion: false }}
        />
      </div>
    </aside>
  )
}

export default ExploreCodeEditorPane
