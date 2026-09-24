import { useEffect, useState } from 'react'

export function useAfterFirstPaint(delayMs = 0): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    let firstFrame = 0
    let secondFrame = 0
    let timer = 0

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (delayMs > 0) {
          timer = window.setTimeout(() => setReady(true), delayMs)
        } else {
          setReady(true)
        }
      })
    })

    return () => {
      window.cancelAnimationFrame(firstFrame)
      window.cancelAnimationFrame(secondFrame)
      window.clearTimeout(timer)
    }
  }, [delayMs])

  return ready
}
