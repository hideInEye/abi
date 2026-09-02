import { CheckOutlined, CopyOutlined, FormOutlined } from '@ant-design/icons'
import { message, Tooltip } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
// @ts-ignore - react-syntax-highlighter 类型定义问题
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// @ts-ignore
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

import styles from './styles.module.css'

export type ExploreCodeLanguage = 'sql' | 'python' | 'bash' | 'json' | 'text'

export interface ExploreCodeEditPayload {
  code: string
  language: ExploreCodeLanguage
  /** 代码所属步骤标题，供右侧编辑面板标题展示。 */
  title: string
}

const SQL_LIKE = /^\s*(select|with|insert|update|delete|create|drop|alter|show|describe)\b/i

/**
 * 识别步骤输出文本的代码类型（sql / python / shell / json），
 * 命中后按千问风格代码块渲染；未命中返回 null 走原富文本渲染。
 * 规则保持保守：首行强信号直接判定，其余按多处特征计分，避免把说明文字误判成代码。
 */
export function detectCodeLanguage(content: string): Exclude<ExploreCodeLanguage, 'text'> | null {
  const text = (content || '').trim()
  if (!text) return null
  if (SQL_LIKE.test(text)) return 'sql'
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      JSON.parse(text)
      return 'json'
    } catch {
      // 不是合法 JSON，继续按 python / shell 特征判断
    }
  }
  const firstLine = text.split('\n', 1)[0].trim()
  if (firstLine.startsWith('#!')) return /python/i.test(firstLine) ? 'python' : 'bash'
  if (/^(import\s+[A-Za-z_]|from\s+[\w.]+\s+import\b|def\s+\w+\s*\(|class\s+\w+.*:|print\s*\()/.test(firstLine)) return 'python'
  if (/^(echo\b|cd\s|ls\b|pip3?\s|python3?\s+\S+\.py|bash\s+\S+\.sh|sh\s+\S+\.sh|set\s+-|export\s+[A-Za-z_]|sudo\s|apt(-get)?\s|yum\s|npm\s|curl\s|wget\s|mkdir\s|chmod\s|source\s)/.test(firstLine)) return 'bash'
  const pythonScore = [
    /\bimport\s+[A-Za-z_][\w.]*/,
    /\bfrom\s+[\w.]+\s+import\b/,
    /\bdef\s+\w+\s*\(/,
    /\bprint\s*\(/,
    /("""|''')[\s\S]*?\1/,
    /^\s*(if|for|while)\b[^:]*:\s*$/m,
    /^\s*return\b/m,
  ].filter((re) => re.test(text)).length
  const shellScore = [
    /\becho\s+["']/,
    /\bpip3?\s+install\b/,
    /\$\(/,
    /&&|\|\|/,
    /\$\{?[A-Za-z_]\w*\}?/,
    /^\s*(cd|ls|mkdir|chmod|curl|wget|sudo|export)\b/m,
  ].filter((re) => re.test(text)).length
  if (pythonScore >= 2 && pythonScore > shellScore) return 'python'
  if (shellScore >= 2 && shellScore > pythonScore) return 'bash'
  return null
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!ok) throw new Error('copy failed')
}

interface ExploreCodeBlockProps {
  code: string
  language: ExploreCodeLanguage
  /** 提供时展示编辑按钮，点击后由上层在右侧面板打开编辑器。 */
  onEdit?: (code: string, language: ExploreCodeLanguage) => void
}

/** 千问风格代码块：顶栏左侧语言标识，右侧编辑 / 复制，主体行号 + 语法高亮。 */
const ExploreCodeBlock: React.FC<ExploreCodeBlockProps> = ({ code, language, onEdit }) => {
  const [copied, setCopied] = useState(false)
  const copyTimerRef = useRef<number>()
  useEffect(() => () => window.clearTimeout(copyTimerRef.current), [])

  const handleCopy = async () => {
    try {
      await copyText(code)
      setCopied(true)
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      message.error('复制失败')
    }
  }

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeBlockLang}>{language}</span>
        <div className={styles.codeBlockActions}>
          {onEdit && (
            <button type="button" className={styles.codeBlockAction} onClick={() => onEdit(code, language)}>
              <FormOutlined /> 编辑
            </button>
          )}
          <Tooltip title={copied ? '已复制' : '复制代码'}>
            <button type="button" className={styles.codeBlockAction} onClick={handleCopy} aria-label="复制代码">
              {copied ? <CheckOutlined style={{ color: 'var(--accent, #5b7cf7)' }} /> : <CopyOutlined />}
            </button>
          </Tooltip>
        </div>
      </div>
      <div className={styles.codeBlockBody}>
        <SyntaxHighlighter
          language={language === 'text' ? undefined : language}
          style={oneLight}
          showLineNumbers
          customStyle={{
            margin: 0,
            padding: '10px 12px',
            background: 'transparent',
            fontSize: '12px',
            lineHeight: 1.7,
          }}
          codeTagProps={{
            style: {
              fontFamily: 'var(--mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)',
            },
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

export default ExploreCodeBlock
