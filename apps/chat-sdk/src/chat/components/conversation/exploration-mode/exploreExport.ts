import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import ExploreRichText, { containsTable } from './ExploreRichText'
import type { ExploreItem, ExploreStepOutput } from './types'

export type ExploreExportFormat = 'word' | 'pdf' | 'html'

/** 右侧工作室只展示数据/文件等结构化输出，过滤技能执行过程文本。 */
export function isStructuredOutput(output: ExploreStepOutput): boolean {
  const content = output.content
  if (typeof content === 'object' && content !== null) return true
  if (typeof content !== 'string' || content.length === 0) return false
  if (output.outputType === 'image' || output.outputType === 'pdf' || output.outputType === 'word' || output.outputType === 'json') return true
  return containsTable(content)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 复用对话内富文本渲染，保证导出文档与工作室展示一致。 */
function renderRichTextHtml(text: string): string {
  return renderToStaticMarkup(React.createElement(ExploreRichText, { text }))
}

function renderOutputHtml(output: ExploreStepOutput): string {
  const content = output.content
  if (typeof content === 'string' && (output.outputType === 'image' || output.outputType === 'pdf' || output.outputType === 'word')) {
    if (output.outputType === 'image') return `<p><img src="${escapeHtml(content)}" alt="步骤输出" style="max-width:100%;" /></p>`
    return `<p><a href="${escapeHtml(content)}">${output.outputType === 'pdf' ? 'PDF' : 'Word'} 文件链接</a></p>`
  }
  if (output.outputType === 'json' || (typeof content === 'object' && content !== null)) {
    return `<pre>${escapeHtml(JSON.stringify(content, null, 2))}</pre>`
  }
  if (typeof content === 'string') return renderRichTextHtml(content)
  return ''
}

/** 导出正文：分步骤执行数据 + 最终结论 + 执行摘要，与工作室分栏内容一致。 */
function buildExportBodyHtml(item: ExploreItem): string {
  const parts: string[] = []
  const resultSteps = item.steps.filter((step) => step.outputs.some(isStructuredOutput))
  if (resultSteps.length > 0) {
    parts.push('<h2>分步骤执行数据</h2>')
    resultSteps.forEach((step, index) => {
      const title = step.title || step.action || `步骤 ${step.step ?? index + 1}`
      parts.push(`<h3>${escapeHtml(title)}</h3>`)
      step.outputs.filter(isStructuredOutput).forEach((output) => parts.push(renderOutputHtml(output)))
    })
  }
  if (item.finalContent) {
    parts.push('<h2>最终结论</h2>')
    parts.push(renderRichTextHtml(item.finalContent))
  }
  if (item.summary) {
    parts.push('<h2>执行摘要</h2>')
    parts.push(renderRichTextHtml(item.summary))
  }
  return parts.join('\n')
}

const EXPORT_STYLE = 'body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;color:#25304d;line-height:1.7;padding:24px;}table{border-collapse:collapse;width:100%;margin:8px 0;}th,td{border:1px solid #c9d2e8;padding:6px 10px;text-align:left;font-size:12.5px;}th{background:#eef2fd;}pre{background:#f4f6fb;border:1px solid #dde3f2;border-radius:6px;padding:10px 12px;white-space:pre-wrap;}h1{font-size:20px;}h2{font-size:16px;margin-top:24px;}h3{font-size:14px;}'

function buildExportDocument(item: ExploreItem, format: ExploreExportFormat): string {
  const title = item.question || '探索结果'
  // Word 需要 office 命名空间声明，才能正确识别 .doc 内的 HTML 内容
  const wordAttrs = format === 'word' ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"' : ''
  return `<!DOCTYPE html><html${wordAttrs}><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>${EXPORT_STYLE}</style></head><body><h1>${escapeHtml(title)}</h1>${buildExportBodyHtml(item)}</body></html>`
}

function getExportFileName(item: ExploreItem, extension: string): string {
  const safe = (item.question || '探索结果')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 60) || '探索结果'
  return `${safe}.${extension}`
}

function triggerBlobDownload(content: string, fileName: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.style.display = 'none'
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** word/pdf/html 均前端本地生成；PDF 走浏览器打印（另存为 PDF），不依赖额外后端接口。 */
export function downloadExploreExport(item: ExploreItem, format: ExploreExportFormat) {
  const html = buildExportDocument(item, format)
  if (format === 'html') {
    triggerBlobDownload(html, getExportFileName(item, 'html'), 'text/html;charset=utf-8')
    return
  }
  if (format === 'word') {
    triggerBlobDownload(html, getExportFileName(item, 'doc'), 'application/msword;charset=utf-8')
    return
  }
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.srcdoc = html
  iframe.onload = () => {
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }, 1000)
  }
  document.body.appendChild(iframe)
}
