// @ts-ignore - react-syntax-highlighter does not publish declarations for ESM subpath exports.
import PrismSyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism-light'
// @ts-ignore - language modules use the same undocumented ESM subpath contract.
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
// @ts-ignore
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
// @ts-ignore
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
// @ts-ignore
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'

PrismSyntaxHighlighter.registerLanguage('bash', bash)
PrismSyntaxHighlighter.registerLanguage('json', json)
PrismSyntaxHighlighter.registerLanguage('python', python)
PrismSyntaxHighlighter.registerLanguage('sql', sql)

export default PrismSyntaxHighlighter
