export interface GenerationGuard {
  begin: () => number
  invalidate: () => void
  isCurrent: (generation: number) => boolean
}

export function createGenerationGuard(initialGeneration = 0): GenerationGuard {
  let current = initialGeneration
  return {
    begin: () => ++current,
    invalidate: () => { current += 1 },
    isCurrent: generation => generation === current,
  }
}
