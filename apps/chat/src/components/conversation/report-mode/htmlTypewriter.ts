/** 用于识别已注入文档，避免同一候选被重复包装。 */
export const REPORT_TYPEWRITER_MARKER = 'data-report-typewriter-runtime="v1"'

const REPORT_TYPEWRITER_RUNTIME = `
(function () {
  'use strict'

  try {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    var root = document.body
    if (!root) return

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement
        if (!parent || !node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT
        if (parent.closest('script,style,noscript,template,textarea,svg,[hidden],[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    var nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)
    if (!nodes.length) return

    var originals = nodes.map(function (node) { return node.nodeValue || '' })
    var total = originals.reduce(function (sum, value) { return sum + value.length }, 0)
    if (!total) return

    var cursorStyle = document.createElement('style')
    cursorStyle.textContent = '[data-report-typewriter-cursor]{display:inline-block;margin-left:1px;color:#5b7cf7;animation:report-typewriter-blink .8s steps(1,end) infinite}@keyframes report-typewriter-blink{50%{opacity:0}}'
    ;(document.head || root).appendChild(cursorStyle)

    var cursor = document.createElement('span')
    cursor.setAttribute('data-report-typewriter-cursor', '')
    cursor.setAttribute('aria-hidden', 'true')
    cursor.textContent = '▋'

    nodes.forEach(function (node) { node.nodeValue = '' })
    nodes[0].parentNode && nodes[0].parentNode.insertBefore(cursor, nodes[0].nextSibling)

    var duration = Math.min(8000, Math.max(1400, total * 10))
    var startedAt
    var nodeIndex = 0
    var nodeRevealed = 0
    var revealedTotal = 0
    var lastTouchedNode = nodes[0]

    function finish(restoreAll) {
      if (restoreAll) {
        nodes.forEach(function (node, index) { node.nodeValue = originals[index] })
      }
      cursor.remove()
      cursorStyle.remove()
    }

    function revealTo(target) {
      while (revealedTotal < target && nodeIndex < nodes.length) {
        var original = originals[nodeIndex]
        var count = Math.min(original.length - nodeRevealed, target - revealedTotal)
        nodeRevealed += count
        revealedTotal += count
        nodes[nodeIndex].nodeValue = original.slice(0, nodeRevealed)
        lastTouchedNode = nodes[nodeIndex]

        if (nodeRevealed === original.length) {
          nodeIndex += 1
          nodeRevealed = 0
        }
      }

      if (lastTouchedNode.parentNode) lastTouchedNode.parentNode.insertBefore(cursor, lastTouchedNode.nextSibling)
    }

    function frame(timestamp) {
      try {
        if (startedAt === undefined) startedAt = timestamp
        var ratio = Math.min(1, (timestamp - startedAt) / duration)
        revealTo(Math.max(1, Math.floor(total * ratio)))

        if (ratio < 1) requestAnimationFrame(frame)
        else finish(false)
      } catch (_error) {
        finish(true)
      }
    }

    requestAnimationFrame(frame)
  } catch (_error) {
    // 运行时异常发生在清空文本之后时也要恢复原文，装饰动画不能阻断报告阅读。
    if (Array.isArray(nodes) && Array.isArray(originals)) {
      nodes.forEach(function (node, index) { node.nodeValue = originals[index] })
    }
    if (cursor && typeof cursor.remove === 'function') cursor.remove()
    if (cursorStyle && typeof cursorStyle.remove === 'function') cursorStyle.remove()
  }
})()
`.trim()

/**
 * 在完整报告之后追加一次性的 iframe 内运行时。
 * 原始 HTML 保持原样且只赋给 srcDoc 一次；浏览器会把尾部脚本归入文档并在沙箱中执行。
 */
export function createTypewriterHtmlDocument(html: string): string {
  if (!html.trim() || html.includes(REPORT_TYPEWRITER_MARKER)) return html
  return `${html}\n<script ${REPORT_TYPEWRITER_MARKER}>${REPORT_TYPEWRITER_RUNTIME}</script>`
}
