const IPV4_SEGMENT = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)'
const IPV4_REGEX = new RegExp(`^(${IPV4_SEGMENT}\\.){3}${IPV4_SEGMENT}$`)

const IPV6_REGEX =
  /^(([0-9a-fA-F]{1,4}:){7}([0-9a-fA-F]{1,4}|:)|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/

function isValidIPv4(value: string): boolean {
  return IPV4_REGEX.test(value)
}

function isValidIPv4CIDR(value: string): boolean {
  const [ip, mask] = value.split('/')
  if (!ip || mask === undefined) return false

  const maskNum = Number(mask)
  return isValidIPv4(ip) && Number.isInteger(maskNum) && maskNum >= 0 && maskNum <= 32
}

function isValidIPv6(value: string): boolean {
  return IPV6_REGEX.test(value)
}

function isValidIPv6CIDR(value: string): boolean {
  const [ip, mask] = value.split('/')
  if (!ip || mask === undefined) return false

  const maskNum = Number(mask)
  return isValidIPv6(ip) && Number.isInteger(maskNum) && maskNum >= 0 && maskNum <= 128
}

export function normalizeIpValue(value: string): string {
  return value.trim()
}

export function validateIpOrCidr(value: string): boolean {
  const normalized = normalizeIpValue(value)
  if (!normalized) return false

  return (
    isValidIPv4(normalized) || isValidIPv4CIDR(normalized) || isValidIPv6(normalized) || isValidIPv6CIDR(normalized)
  )
}

export function isIpDuplicated(list: string[], value: string): boolean {
  const normalized = normalizeIpValue(value).toLowerCase()
  return list.some(item => normalizeIpValue(item).toLowerCase() === normalized)
}

export function isMaskedValue(value?: string | null): boolean {
  if (!value) return false
  return /\*{2,}/.test(value)
}

export function generateCredential(prefix: 'ak' | 'cli' | 'sk'): string {
  const randomPart = Math.random().toString(16).slice(2, 12)
  return `${prefix}_${randomPart}`
}
