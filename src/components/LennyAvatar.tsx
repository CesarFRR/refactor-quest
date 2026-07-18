/* ============================================================
   RefactorQuest — LennyAvatar
   Lenny: binoculares con ojos (inspirado en Toy Story).
   Asistente flotante abajo-derecha: Lenny SVG + nubecita.
   Animaciones: parpadeo, rebote sutil al hablar, mirada sigue
   cursor, temblor al detectar error, celebración con partículas,
   crecimiento responsive según pantalla.
   ============================================================ */
import { useEffect, useState, useRef, useCallback } from 'react'
import type { AvatarMode, AvatarZone, CompileStatus } from '../types'

interface Props {
  mode: AvatarMode
  message?: string
  /** Resalta una línea del editor (Lenny "mira" hacia allí) */
  highlightLine?: number
  /** Estado de compilación — Lenny tiembla si hay error de sintaxis */
  compileStatus?: CompileStatus
  /** Zona donde Lenny se posiciona (bottom-right, panel, editor, footer) */
  zone?: AvatarZone
  /** Avanzar al siguiente paso del walkthrough */
  onConfirmStep?: () => void
  /** Texto del botón del paso */
  confirmLabel?: string
  /** Para guided-smell: botón para que Lenny inyecta su refactor */
  onInjectGuided?: () => void
  injectLabel?: string
}

type Mood = 'idle' | 'talking' | 'pointing' | 'celebrating' | 'sleeping' | 'error'

function pickMood(
  message: string | undefined,
  highlightLine: number | undefined,
  compileStatus: CompileStatus | undefined,
  mode: AvatarMode,
): Mood {
  if (compileStatus === 'syntax-error') return 'error'
  // Sleeping SÓLO en modo 'off' (nivel 5). En otros modos, aunque el avatar
  // termine sus pasos, Lenny se queda idle (despierto, parpadeando, sin burbuja).
  if (mode === 'off' && !message) return 'sleeping'
  if (message && /100%|completamente estabilizado|estabilizado/i.test(message)) return 'celebrating'
  if (highlightLine) return 'pointing'
  if (message) return 'talking'
  return 'idle'
}

/** Tamaño responsive: crece cuando tiene un mensaje importante. */
function useResponsiveSize(talking: boolean): number {
  const [size, setSize] = useState(() => {
    const base = typeof window === 'undefined' ? 100 : +Math.min(120, Math.max(100, Math.round(window.innerWidth / 8)))
    return talking ? Math.min(170, Math.max(base * 1.35, 130)) : base
  })
  useEffect(() => {
    const base = Math.min(120, Math.max(100, Math.round(window.innerWidth / 8)))
    setSize(talking ? Math.min(170, Math.max(base * 1.35, 130)) : base)
  }, [talking])
  useEffect(() => {
    const onResize = () => {
      const base = Math.min(120, Math.max(100, Math.round(window.innerWidth / 8)))
      setSize(talking ? Math.min(170, Math.max(base * 1.35, 130)) : base)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [talking])
  return size +50
}

export function LennyAvatar({
  mode,
  message,
  highlightLine,
  compileStatus,
  zone = 'bottom-right',
  onConfirmStep,
  confirmLabel,
  onInjectGuided,
  injectLabel,
}: Props) {
  const mood = pickMood(message, highlightLine, compileStatus, mode)
  const [blink, setBlink] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [prevMessage, setPrevMessage] = useState<string | undefined>(message)
  const [bounce, setBounce] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; dy: number; rot: number; emoji: string }>>([])
  const talking = !!message && !dismissed
  const size = useResponsiveSize(talking)
  const particleIdRef = useRef(0)

  // Reset dismiss + disparar rebote cuando llega un mensaje nuevo — adjust-during-render
  if (prevMessage !== message) {
    setPrevMessage(message)
    if (message) {
      setDismissed(false)
      setBounce(true)
    }
  }

  // Cancelar el rebote después de 400ms (sólo side-effect, no setState directo)
  useEffect(() => {
    if (!bounce) return
    const t = setTimeout(() => setBounce(false), 400)
    return () => clearTimeout(t)
  }, [bounce])

  // Parpadeo natural cada ~4s
  useEffect(() => {
    if (mood === 'sleeping') return
    const id = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 140)
    }, 3800 + Math.random() * 1200)
    return () => clearInterval(id)
  }, [mood])

  // Celebración: disparar partículas cuando mood === 'celebrating'
  useEffect(() => {
    if (mood !== 'celebrating') return
    const emojis = ['⭐', '✨', '🎉', '💫', '★']
    const newParts = Array.from({ length: 12 }, (_, i) => ({
      id: particleIdRef.current++,
      x: (i - 6) * 8 + (Math.random() - 0.5) * 10,
      dy: -60 - Math.random() * 40,
      rot: (Math.random() - 0.5) * 360,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    }))
    setParticles(newParts)
    const t = setTimeout(() => setParticles([]), 1500)
    return () => clearTimeout(t)
  }, [mood])

  // Mirada sigue al cursor del mouse (sólo cuando está idle/talking)
  const [eyeTarget, setEyeTarget] = useState({ leftX: 0, leftY: 0, rightX: 0, rightY: 0 })
  const [cursorSeen, setCursorSeen] = useState(false)
  const lennyRef = useRef<HTMLDivElement>(null)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (mood === 'sleeping' || mood === 'celebrating') return
    const el = lennyRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const leftCenterX = rect.left + rect.width * 0.31
    const rightCenterX = rect.left + rect.width * 0.69
    const eyeCenterY = rect.top + rect.height * 0.54
    const max = 3.5
    const clamp = (value: number) => Math.max(-max, Math.min(max, value))
    const targetForEye = (centerX: number) => {
      const edx = e.clientX - centerX
      const edy = e.clientY - eyeCenterY
      const dist = Math.sqrt(edx * edx + edy * edy)
      return {
        x: clamp(edx / Math.max(dist, 1) * max),
        y: clamp(edy / Math.max(dist, 1) * max),
      }
    }
    const left = targetForEye(leftCenterX)
    const right = targetForEye(rightCenterX)
    setEyeTarget({
      leftX: left.x,
      leftY: left.y,
      rightX: right.x,
      rightY: right.y,
    })
    setCursorSeen(true)
  }, [mood])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  // Desplazamiento de pupilas: cada ojo usa su propio vector contra el cursor.
  // No hay interpolación ni suavizado; el estado solo refleja la última posición del mouse.
  const eyeShiftLeft = cursorSeen ? eyeTarget.leftX : mood === 'pointing' ? 1.5 : 0
  const pupilYLeft = cursorSeen ? eyeTarget.leftY : mood === 'pointing' ? -1 : 0
  const eyeShiftRight = cursorSeen ? eyeTarget.rightX : mood === 'pointing' ? 1.5 : 0
  const pupilYRight = cursorSeen ? eyeTarget.rightY : mood === 'pointing' ? -1 : 0

  const accent =
    mood === 'celebrating' ? '#98c379' :
    mood === 'pointing'    ? '#e5c07b' :
    mood === 'talking'     ? '#61afef' :
    mood === 'error'       ? '#e06c75' :
    mood === 'sleeping'    ? '#4b5263' :
                             '#848a97'  // gris por defecto

  const showBubble = !dismissed && (message || mode === 'off')
  const showButton = !dismissed && (onConfirmStep || onInjectGuided)

  // Animación CSS inyectada una sola vez
  useEffect(() => {
    const styleId = 'lenny-animations'
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes lenny-bounce { 0%{transform:translateY(0)} 30%{transform:translateY(-6px)} 60%{transform:translateY(2px)} 100%{transform:translateY(0)} }
      @keyframes lenny-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-2px)} 40%{transform:translateX(2px)} 60%{transform:translateX(-1px)} 80%{transform:translateX(1px)} }
      @keyframes lenny-particle { 0%{opacity:1;transform:translate(0,0) rotate(0)} 100%{opacity:0;transform:translate(var(--px),var(--py)) rotate(var(--rot))} }
      @keyframes lenny-bubble-in { from{opacity:0;transform:translateY(8px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
    `
    document.head.appendChild(style)
    return () => { document.getElementById(styleId)?.remove() }
  }, [])

  const lennyAnim =
    bounce ? 'lenny-bounce 0.4s ease' :
    mood === 'error' ? 'lenny-shake 0.4s ease infinite' :
    undefined

  return (
    <div style={{
      position: 'fixed',
      right: 12,
      bottom:  12,
      zIndex: 200,
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
      fontFamily: "'JetBrains Mono', monospace",
      pointerEvents: showBubble ? 'auto' : 'none',
      transition: 'right 0.3s ease, bottom 0.3s ease',
    }}>
      {/* Partículas de celebración */}
      {particles.length > 0 && (
        <div style={{
          position: 'absolute',
          right: size / 2, bottom: size / 2,
          pointerEvents: 'none', zIndex: 210,
        }}>
          {particles.map(p => (
            <span key={p.id} style={{
              position: 'absolute',
              fontSize: 14,
              ['--px' as string]: `${p.x}px`,
              ['--py' as string]: `${p.dy}px`,
              ['--rot' as string]: `${p.rot}deg`,
              animation: 'lenny-particle 1.4s ease-out forwards',
            }}>{p.emoji}</span>
          ))}
        </div>
      )}

      {/* Nubecita a la izquierda de Lenny */}
      {showBubble && (
        <div style={{
          background: '#21252b',
          border: `1px solid ${accent}55`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: 8,
          padding: '8px 12px',
          maxWidth: 280,
          minWidth: 180,
          position: 'relative',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          pointerEvents: 'auto',
          animation: 'lenny-bubble-in 0.2s ease',
        }}>
          {/* Pico de la nubecita apuntando a Lenny (abajo-derecha) */}
          <div style={{
            position: 'absolute',
            right: -8, bottom: 10,
            width: 0, height: 0,
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderLeft: `8px solid ${accent}55`,
          }} />
          <div style={{
            position: 'absolute',
            right: -7, bottom: 11,
            width: 0, height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderLeft: `7px solid #21252b`,
          }} />

          <div style={{ fontSize: 14, color: '#abb2bf', lineHeight: 1.5 }}>
            {mode === 'off' && !message
              ? <span style={{ color: '#4b5263', fontStyle: 'italic' }}>…</span>
              : message}
          </div>

          {/* Botones dentro de la nubecita */}
          {showButton && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {onConfirmStep && confirmLabel && (
                <button onClick={() => { onConfirmStep(); setDismissed(true) }} style={btnStyle(accent)}>
                  {confirmLabel}
                </button>
              )}
              {onInjectGuided && injectLabel && (
                <button onClick={() => { onInjectGuided(); setDismissed(true) }} style={btnStyle(accent)}>
                  {injectLabel}
                </button>
              )}
            </div>
          )}

          {/* Cerrar nubecita */}
          <button
            onClick={() => setDismissed(true)}
            aria-label="Cerrar"
            style={{
              position: 'absolute',
              top: 4, right: 6,
              background: 'none', border: 'none',
              color: '#4b5263', fontSize: 12, cursor: 'pointer',
              lineHeight: 1, padding: 2,
            }}
          >×</button>
        </div>
      )}

      {/* Lenny SVG siempre visible (parpadea, rebota, tiembla, celebra) */}
      <div ref={lennyRef} style={{
        pointerEvents: 'auto',
        animation: lennyAnim,
        position: 'relative',
        width: size,
        height: size,
        transition: 'width 0.3s ease, height 0.3s ease',
      }}>
        <LennySvg
          mood={mood}
          blink={blink}
          eyeShiftLeft={eyeShiftLeft}
          pupilYLeft={pupilYLeft}
          eyeShiftRight={eyeShiftRight}
          pupilYRight={pupilYRight}
          accent={accent}
          size={size}
        />
      </div>
    </div>
  )
}

function btnStyle(accent: string): React.CSSProperties {
  return {
    padding: '5px 10px',
    background: 'transparent',
    color: accent,
    border: `1px solid ${accent}66`,
    borderRadius: 4,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    textTransform: 'uppercase',
  }
}

/* Diseño original: dos lentes circulares grises conectados por un puente,
   con ojos expresivos que se mueven. Sin patas (no es copyright de Pixar).
   Color del cuerpo: gris por defecto, el accent (ojos/anillos) cambia con mood. */
function LennySvg({
  mood, blink, eyeShiftLeft, pupilYLeft, eyeShiftRight, pupilYRight, accent, size,
}: {
  mood: Mood
  blink: boolean
  eyeShiftLeft: number
  pupilYLeft: number
  eyeShiftRight: number
  pupilYRight: number
  accent: string
  size: number
}) {
  const eyeOpen = !blink && mood !== 'sleeping'
  // Cuerpo gris por defecto; acento (ojos/anillos) cambia con mood
  const bodyGray = '#00000000'
  const bodyGrayDark = '#00000000'
  const bodyGrayLight = '#00000000'
  const ringColor = mood === 'error' ? '#e06c75' : accent

  return (
    <svg
      width="100%" height="100%" viewBox="0 0 70 56"
      style={{ filter: mood === 'sleeping' ? 'grayscale(0.6) opacity(0.5)' : 'none' }}
    >
      <defs>
        <radialGradient id="lenny-body" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor={bodyGrayLight} />
          <stop offset="60%" stopColor={bodyGray} />
          <stop offset="100%" stopColor={bodyGrayDark} />
        </radialGradient>
        <radialGradient id="lenny-lens" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#1a1e24" />
          <stop offset="100%" stopColor="#0a0d1200" />
        </radialGradient>
        <radialGradient id="lenny-shine" cx="0.3" cy="0.25" r="0.4">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Dos lentes circulares (el binocular) ── */}
      <circle cx="20" cy="34" r="14" fill="url(#lenny-body)" stroke={ringColor} strokeWidth="2" />
      <circle cx="50" cy="34" r="14" fill="url(#lenny-body)" stroke={ringColor} strokeWidth="2" />
      {/* Puente entre los dos lentes */}
      <rect x="31" y="31" width="2" height="6" rx="1" fill={bodyGrayDark} />

      {/* ── Vidrio de los lentes ── */}
      <circle cx="20" cy="34" r="10" fill="url(#lenny-lens)" stroke={ringColor} strokeWidth="0.8" />
      <circle cx="50" cy="34" r="10" fill="url(#lenny-lens)" stroke={ringColor} strokeWidth="0.8" />

      {/* Brillo en el vidrio */}
      <circle cx="20" cy="34" r="10" fill="url(#lenny-shine)" />
      <circle cx="50" cy="34" r="10" fill="url(#lenny-shine)" />

      {/* ── Ojos / pupilas (se mueven, cambian de color con mood) ── */}
      {eyeOpen ? (
        <>
          <circle cx={20 + eyeShiftLeft} cy={34 + pupilYLeft} r="4.5" fill={accent} />
          <circle cx={50 + eyeShiftRight} cy={34 + pupilYRight} r="4.5" fill={accent} />
          {/* Brillo */}
          <circle cx={20 + eyeShiftLeft + 1.5} cy={34 + pupilYLeft - 1.5} r="1.4" fill="#ffffff" opacity="0.9" />
          <circle cx={50 + eyeShiftRight + 1.5} cy={34 + pupilYRight - 1.5} r="1.4" fill="#ffffff" opacity="0.9" />
          <circle cx={20 + eyeShiftLeft - 1} cy={34 + pupilYLeft + 1.5} r="0.6" fill="#ffffff" opacity="0.6" />
          <circle cx={50 + eyeShiftRight - 1} cy={34 + pupilYRight + 1.5} r="0.6" fill="#ffffff" opacity="0.6" />
        </>
      ) : (
        <>
          <path d={`M15 ${34} Q20 ${37} 25 ${34}`} stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d={`M45 ${34} Q50 ${37} 55 ${34}`} stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ── Expresiones según mood ── */}
      {mood === 'error' && (
        <g fill="#e06c75">
          <rect x="30" y="2" width="4" height="9" rx="2" />
          <circle cx="32" cy="15" r="2.2" />
        </g>
      )}

      {mood === 'celebrating' && (
        <g stroke="#98c379" strokeWidth="1.6" strokeLinecap="round" fill="none">
          <line x1="32" y1="3" x2="32" y2="9" />
          <line x1="16" y1="6" x2="19" y2="12" />
          <line x1="48" y1="6" x2="45" y2="12" />
          <line x1="6" y1="16" x2="11" y2="20" />
          <line x1="58" y1="16" x2="53" y2="20" />
        </g>
      )}

      {mood === 'pointing' && (
        <g stroke="#e5c07b" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M28 3 L32 8 L36 3" />
        </g>
      )}

      {mood === 'sleeping' && (
        <text x="46" y="12" fontSize="12" fill="#4b5263" fontFamily="'JetBrains Mono', monospace" fontWeight="700">z</text>
      )}
    </svg>
  )
}
