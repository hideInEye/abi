import React from 'react'
import ReactMarkdown from 'react-markdown'

import styles from './styles.module.css'

interface ExploreRichTextProps {
  text: string
}

interface ParsedTable {
  headers: string[]
  rows: string[][]
}

const SEP_CELL = /^:?-{2,}:?$/

/**
 * 后端返回的表格常被压成一行，例如：
 * `| 测站代码 | 测站名称 | | --- | --- | | saz0001 | 赣江水文站 | ...`
 * 标准 markdown / remark-gfm 无法解析这种单行结构，这里按分隔符列数还原成表格。
 */
function parsePipeTable(block: string): ParsedTable | null {
  const cells = block
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0)

  const colCount = cells.filter((cell) => SEP_CELL.test(cell)).length
  if (colCount < 1) return null

  const dataCells = cells.filter((cell) => !SEP_CELL.test(cell))
  if (dataCells.length < colCount) return null

  const headers = dataCells.slice(0, colCount)
  const bodyCells = dataCells.slice(colCount)
  const rows: string[][] = []
  for (let i = 0; i < bodyCells.length; i += colCount) {
    const row = bodyCells.slice(i, i + colCount)
    while (row.length < colCount) row.push('')
    rows.push(row)
  }

  return { headers, rows }
}

type Block = { type: 'text'; content: string } | { type: 'table'; table: ParsedTable }

/** 按行分组：连续的含 `|` 行归为一段表格候选，其余为普通文本，最终整体保序渲染。 */
function splitBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let buffer: string[] = []
  let bufferIsPipe = false

  const flush = () => {
    if (buffer.length === 0) return
    const joined = buffer.join('\n')
    if (bufferIsPipe) {
      const table = parsePipeTable(joined)
      if (table) {
        blocks.push({ type: 'table', table })
        buffer = []
        return
      }
    }
    blocks.push({ type: 'text', content: joined })
    buffer = []
  }

  for (const line of lines) {
    const pipeCount = (line.match(/\|/g) || []).length
    const isPipe = pipeCount >= 2
    if (isPipe !== bufferIsPipe) {
      flush()
      bufferIsPipe = isPipe
    }
    buffer.push(line)
  }
  flush()

  return blocks
}

const DataTable: React.FC<{ table: ParsedTable }> = ({ table }) => (
  <div className={styles.tableWrap}>
    <table className={styles.dataTable}>
      <thead>
        <tr>
          {table.headers.map((header, index) => (
            <th key={index}>{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <div className={styles.tableCaption}>共 {table.rows.length} 条记录</div>
  </div>
)

/** 探索模式统一的富文本渲染：自动识别（含被压成一行的）表格并以系统风格展示。 */
const ExploreRichText: React.FC<ExploreRichTextProps> = ({ text }) => {
  const blocks = React.useMemo(() => splitBlocks(text || ''), [text])

  return (
    <div className={styles.richText}>
      {blocks.map((block, index) =>
        block.type === 'table' ? (
          <DataTable key={index} table={block.table} />
        ) : (
          <ReactMarkdown
            key={index}
            components={{
              a: ({ children, ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
            }}
          >
            {block.content}
          </ReactMarkdown>
        )
      )}
    </div>
  )
}

export default ExploreRichText
