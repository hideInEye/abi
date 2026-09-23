import { useCallback, useEffect, useRef, useState } from 'react'

import { queryDictTypeOptions } from '@/service/api/dictionary'
import { assertFlatRequestSuccess } from '@/service/request/flat-result'

import { adaptDictTypeOptions } from '../dictionary-adapter'
import type { SysDictType } from '../types'

interface UseDictTypeOptionsResult {
  error: boolean
  loading: boolean
  options: SysDictType[]
  refresh: () => Promise<boolean>
}

export function useDictTypeOptions(): UseDictTypeOptionsResult {
  const [options, setOptions] = useState<SysDictType[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const requestSequence = useRef(0)

  const refresh = useCallback(async (): Promise<boolean> => {
    requestSequence.current += 1
    const requestId = requestSequence.current
    setLoading(true)
    setError(false)

    try {
      const result = await queryDictTypeOptions()
      assertFlatRequestSuccess(result)
      if (requestId !== requestSequence.current) return false

      setOptions(adaptDictTypeOptions(result))
      return true
    } catch {
      if (requestId === requestSequence.current) setError(true)
      return false
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh().catch(() => undefined)
    return () => {
      requestSequence.current += 1
    }
  }, [refresh])

  return { error, loading, options, refresh }
}
