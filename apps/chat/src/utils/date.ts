import dayjs from 'dayjs'

export const formatTimeDiff = (
  inputTime: string,
  options?: {
    formatWhenOver24h?: string
  },
) => {
  const now = dayjs()
  if (!inputTime) return now.format(options?.formatWhenOver24h ?? 'YYYY-MM-DD HH:mm:ss')

  const target = dayjs(inputTime)
  if (!target.isValid()) return ''

  const diffSeconds = now.diff(target, 'second')
  if (diffSeconds < 0) return '0s'
  if (diffSeconds >= 24 * 60 * 60) {
    return target.format(options?.formatWhenOver24h ?? 'YYYY-MM-DD HH:mm:ss')
  }

  const hours = Math.floor(diffSeconds / 3600)
  const minutes = Math.floor((diffSeconds % 3600) / 60)
  const seconds = diffSeconds % 60

  if (hours > 0) return `${hours}小时${minutes}分钟前`
  if (minutes > 0) return `${minutes}分钟${seconds}秒前`
  return `${seconds}秒前`
}
