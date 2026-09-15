const REPORT_CSP = "default-src 'none'; img-src data: http: https:; media-src data: http: https:; style-src 'unsafe-inline' http: https:; font-src data: http: https:; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"
const CSP_META = `<meta http-equiv="Content-Security-Policy" content="${REPORT_CSP}">`

export function createSafeHtmlDocument(html: string): string {
  if (!html.trim()) return html
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(?:\s[^>]*)?>/i, match => `${match}${CSP_META}`)
  }
  return `${CSP_META}${html}`
}
