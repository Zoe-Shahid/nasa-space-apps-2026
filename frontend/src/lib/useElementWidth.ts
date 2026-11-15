import { useEffect, useRef, useState, type RefObject } from 'react'

export function useElementWidth<T extends HTMLElement>(): [RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(640)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const update = () => setWidth(Math.max(Math.floor(element.getBoundingClientRect().width), 1))
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}
