import { useEffect, useState, useRef } from 'react'
import type { ZoneId } from '../types'

interface Props {
  zoneId?: ZoneId
  visible: boolean
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export function ZoneHighlightOverlay({ zoneId, visible }: Props) {
  const [rect, setRect] = useState<Rect | null>(null)
  const rafRef = useRef(0)

  useEffect(() => {
    if (!visible || !zoneId) {
      setRect(null)
      return
    }

    const update = () => {
      const el = document.querySelector(`[data-zone="${zoneId}"]`)
      if (!el) {
        setRect(null)
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    // Actualizar posición inmediatamente y en cada animación frame
    update()
    const loop = () => {
      update()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(rafRef.current)
  }, [zoneId, visible])

  if (!rect) return null

  return (
    <div style={{
      position: 'fixed',
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      zIndex: 150,
      pointerEvents: 'none',
      border: '2px solid rgba(97,175,239,0.45)',
      borderRadius: 4,
      background: 'rgba(97,175,239,0.04)',
      boxShadow: 'inset 0 0 40px rgba(97,175,239,0.1), 0 0 30px rgba(97,175,239,0.08)',
    }} />
  )
}
