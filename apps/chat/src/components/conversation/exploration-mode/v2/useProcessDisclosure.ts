import { useCallback, useState } from 'react'

import { resolveDisclosure } from './displayModel'

export interface ProcessDisclosure {
  isOpen: (key: string, automatic?: boolean) => boolean
  toggle: (key: string, automatic: boolean, trigger: HTMLElement) => void
  reveal: (key: string) => void
}

export function useProcessDisclosure(beforeToggle: (trigger: HTMLElement) => void): ProcessDisclosure {
  // 状态放在消息级，父节点折叠卸载详情后仍保留用户的选择。
  const [manual, setManual] = useState<Record<string, boolean>>({})
  const reveal = useCallback((key: string) => {
    setManual((previous) => (previous[key] ? previous : { ...previous, [key]: true }))
  }, [])
  return {
    isOpen: (key, automatic = false) => resolveDisclosure(manual[key], automatic),
    toggle: (key, automatic, trigger) => {
      beforeToggle(trigger)
      setManual((previous) => ({ ...previous, [key]: !resolveDisclosure(previous[key], automatic) }))
    },
    reveal,
  }
}
