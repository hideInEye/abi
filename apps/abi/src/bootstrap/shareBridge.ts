export function mountShareBridge(targetUrl: string) {
  const container = document.getElementById('root')
  if (!container) throw new Error('ABI root container is missing')

  const iframe = document.createElement('iframe')
  iframe.src = targetUrl
  iframe.title = '分享页面'
  iframe.setAttribute('aria-label', '分享页面')
  iframe.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;background:#f4f6fb;'
  container.replaceChildren(iframe)
}
