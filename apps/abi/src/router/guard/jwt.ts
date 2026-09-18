interface JwtPayload {
  exp?: unknown
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  return atob(padded)
}

export function isJwtExpired(token: unknown, now = Date.now(), clockSkewMs = 30_000): boolean {
  if (typeof token !== 'string' || !token) return true

  const parts = token.split('.')
  if (parts.length !== 3) return false

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1])) as JwtPayload
    return typeof payload.exp === 'number' && payload.exp * 1000 < now + clockSkewMs
  } catch {
    // Opaque or malformed tokens are left to the backend instead of being rejected locally.
    return false
  }
}
