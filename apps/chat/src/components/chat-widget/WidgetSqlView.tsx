import { Typography } from 'antd'
import { format as formatSql } from 'sql-formatter'
import SyntaxHighlighter from '../performance/PrismSyntaxHighlighter'
// @ts-ignore - react-syntax-highlighter 类型定义问题
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'

import viewStyles from '../conversation/styles.module.css'

const { Text } = Typography

export default function WidgetSqlView({ sql }: { sql?: string }) {
  let displayText = sql || ''
  if (sql) {
    try {
      displayText = formatSql(sql, { language: 'sql', tabWidth: 2, keywordCase: 'upper', linesBetweenQueries: 2 })
    } catch {
      displayText = sql
    }
  }

  return (
    <div className={viewStyles.sqlCodeBlock}>
      <div className={viewStyles.sqlCodeBlockHeader}>
        <span>SQL</span>
        <Text copyable={{ text: displayText, tooltips: ['复制', '已复制'] }} />
      </div>
      <SyntaxHighlighter
        language="sql"
        style={oneLight}
        showLineNumbers
        customStyle={{ margin: 0, borderRadius: '0 0 10px 10px', fontSize: '0.8125rem', backgroundColor: 'transparent', padding: '12px 14px' }}
        codeTagProps={{ style: { fontFamily: 'Consolas, Monaco, "Courier New", monospace' } }}
      >
        {displayText || '暂无 SQL 语句'}
      </SyntaxHighlighter>
    </div>
  )
}
