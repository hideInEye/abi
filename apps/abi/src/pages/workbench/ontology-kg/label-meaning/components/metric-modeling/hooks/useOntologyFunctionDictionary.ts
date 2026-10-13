import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  ONTOLOGY_ATOMIC_AGGREGATION_DICTIONARY_TYPES,
  ONTOLOGY_FUNCTION_DICTIONARY_TYPES,
  ONTOLOGY_OPERATOR_DICTIONARY_TYPES,
  type OntologyFunctionDictionaryKind,
  type OntologyFunctionOption,
  adaptOntologyAggregationMethodOptions,
  loadOntologyFunctionOptions
} from '../utils/ontologyFunctionDictionary'

function useOntologyDictionaryOptions(dictTypes: readonly string[]) {
  const [options, setOptions] = useState<OntologyFunctionOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const requestSequence = useRef(0)

  const refresh = useCallback(async (): Promise<boolean> => {
    requestSequence.current += 1
    const requestId = requestSequence.current
    setLoading(true)
    setError(false)
    try {
      const nextOptions = await loadOntologyFunctionOptions(dictTypes)
      if (requestId !== requestSequence.current) return false
      setOptions(nextOptions)
      return true
    } catch {
      if (requestId === requestSequence.current) {
        setOptions([])
        setError(true)
      }
      return false
    } finally {
      if (requestId === requestSequence.current) setLoading(false)
    }
  }, [dictTypes])

  useEffect(() => {
    refresh().catch(() => undefined)
    return () => {
      requestSequence.current += 1
    }
  }, [refresh])

  return { error, loading, options, refresh }
}

export function useOntologyFunctionDictionary(kind: OntologyFunctionDictionaryKind) {
  return useOntologyDictionaryOptions(ONTOLOGY_FUNCTION_DICTIONARY_TYPES[kind])
}

export function useOntologyOperatorDictionary() {
  return useOntologyDictionaryOptions(ONTOLOGY_OPERATOR_DICTIONARY_TYPES)
}

export function useOntologyAtomicAggregationDictionary() {
  const result = useOntologyDictionaryOptions(ONTOLOGY_ATOMIC_AGGREGATION_DICTIONARY_TYPES)
  const options = useMemo(() => adaptOntologyAggregationMethodOptions(result.options), [result.options])
  return { ...result, options }
}
