/* ============================================================
   RefactorQuest — CodyAvatar
   Cody: binoculares con ojos (inspirado en Toy Story).
   Asistente flotante abajo-derecha: Cody SVG + nubecita.
   Animaciones: parpadeo, rebote sutil al hablar, mirada sigue
   cursor, temblor al detectar error, celebración con partículas,
   crecimiento responsive según pantalla, auto-sleep por inactividad,
   click en idle para recordar último mensaje.
   ============================================================ */
import { useEffect, useState, useRef, useCallback } from 'react'
import type { AvatarMode, AvatarZone, CompileStatus, Mood } from '../types'

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
}

interface Props {
  mode: AvatarMode
  message?: string
  /** Resalta una línea del editor (Cody "mira" hacia allí) */
  highlightLine?: number
  /** Estado de compilación — Cody tiembla si hay error de sintaxis */
  compileStatus?: CompileStatus
  /** Zona donde Cody se posiciona (bottom-right, panel, editor, footer) */
  zone?: AvatarZone
  /** Avanzar al siguiente paso del walkthrough */
  onConfirmStep?: () => void
  /** Texto del botón del paso */
  confirmLabel?: string
  /** Para guided-smell: botón para que Cody inyecta su refactor */
  onInjectGuided?: () => void
  injectLabel?: string
  /** Cody se enoja si hay errores y el jugador da a Ejecutar tests */
  angryOnTest?: boolean
  /** Cody está escribiendo código (animación de pensamiento) */
  avatarInjecting?: boolean
  /** Emoción explícita del paso (si se definió en el nivel) */
  mood?: Mood
}

function pickMood(
  message: string | undefined,
  highlightLine: number | undefined,
  compileStatus: CompileStatus | undefined,
  mode: AvatarMode,
  angryOnTest?: boolean,
  avatarInjecting?: boolean,
  isSleeping?: boolean,
): Mood {
  if (avatarInjecting) return 'thinking'
  if (angryOnTest) return 'error'
  if (compileStatus === 'syntax-error') return 'error'
  // Sleeping: modo 'off' sin mensaje, o inactividad prolongada
  if ((mode === 'off' && !message) || isSleeping) return 'sleeping'
  if (message && /100%|completamente estabilizado|estabilizado|¡perfecto!|genial|excelente/i.test(message)) return 'celebrating'
  if (message && /¿\?|no entiendo|confund|algo está mal|revisa/i.test(message)) return 'confused'
  if (message && /¡wow!|increíble|asombro|felicidade/i.test(message)) return 'amazed'
  if (message) return 'talking'
  if (highlightLine) return 'pointing'
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
  return size + 50
}

const SLEEP_AFTER_MS = 10000

export function CodyAvatar({
  mode,
  message,
  highlightLine,
  compileStatus,
  zone: _zone = 'bottom-right', // eslint-disable-line @typescript-eslint/no-unused-vars
  onConfirmStep,
  confirmLabel,
  onInjectGuided,
  injectLabel,
  angryOnTest,
  avatarInjecting,
}: Props) {
  const [blink, setBlink] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [prevMessage, setPrevMessage] = useState<string | undefined>(message)
  const [bounce, setBounce] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; dy: number; rot: number; emoji: string }>>([])
  const [isSleeping, setIsSleeping] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | undefined>(undefined)
  const [showRecalledMessage, setShowRecalledMessage] = useState(false)
  const talking = !!message && !dismissed
  const size = useResponsiveSize(talking)
  const particleIdRef = useRef(0)
  const lastActivityRef = useRef(0)
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mood = props.mood ?? pickMood(message, highlightLine, compileStatus, mode, angryOnTest, avatarInjecting, isSleeping)

  // Guardar último mensaje importante para poder recordarlo con click
  useEffect(() => {
    if (message && !dismissed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLastMessage(message)
      setShowRecalledMessage(false)
    }
  }, [message, dismissed])

  // Reset dismiss + disparar rebote cuando llega un mensaje nuevo
  if (prevMessage !== message) {
    setPrevMessage(message)
    if (message) {
      setDismissed(false)
      setBounce(true)
      setIsSleeping(false)
    }
  }

  // Actualizar timestamp de actividad cuando llega un mensaje nuevo
  useEffect(() => {
    if (message) lastActivityRef.current = Date.now()
  }, [message])

  // Cancelar el rebote después de 400ms
  useEffect(() => {
    if (!bounce) return
    const t = setTimeout(() => setBounce(false), 400)
    return () => clearTimeout(t)
  }, [bounce])

  // Parpadeo natural cada ~4s
  useEffect(() => {
    if (mood === 'sleeping' || mood === 'thinking') return
    const id = setInterval(() => {
      setBlink(true)
      setTimeout(() => setBlink(false), 140)
    }, 3800 + Math.random() * 1200)
    return () => clearInterval(id)
  }, [mood])

  // Celebración: disparar partículas
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

  // ── Auto-sleep por inactividad ──
  // Tras SLEEP_AFTER_MS sin mover el mouse, Cody se duerme.
  // Se despierta al mover el mouse o al llegar un mensaje nuevo.
  const resetSleepTimer = useCallback(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current)
      sleepTimerRef.current = null
    }
    sleepTimerRef.current = setTimeout(() => {
      // No dormir mientras inyecta código; lo demás sí
      if (!avatarInjecting) {
        setIsSleeping(true)
      }
    }, SLEEP_AFTER_MS)
  }, [avatarInjecting])

  const wakeUp = useCallback(() => {
    lastActivityRef.current = Date.now()
    setIsSleeping(false)
    resetSleepTimer()
  }, [resetSleepTimer])

  // Arrancar el timer al montar (sin despertar)
  useEffect(() => {
    resetSleepTimer()
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current)
    }
  }, [resetSleepTimer])

  // ── Seguimiento ocular optimizado ──
  const [eyeTarget, setEyeTarget] = useState({ leftX: 0, leftY: 0, rightX: 0, rightY: 0 })
  const [cursorSeen, setCursorSeen] = useState(false)
  const codyRef = useRef<HTMLDivElement>(null)
  const eyeCentersRef = useRef({ leftX: 0, rightX: 0, eyeCenterY: 0 })
  const eyeRafRef = useRef(0)
  const prevEyeRef = useRef({ leftX: 0, leftY: 0 })
  const skipTracking = mood === 'sleeping' || mood === 'thinking' || mood === 'celebrating' || mood === 'happy' || mood === 'tired' || !!message

  useEffect(() => {
    const el = codyRef.current
    if (!el) return
    const updateCenters = () => {
      const rect = el.getBoundingClientRect()
      eyeCentersRef.current = {
        leftX: rect.left + rect.width * 0.31,
        rightX: rect.left + rect.width * 0.69,
        eyeCenterY: rect.top + rect.height * 0.54,
      }
    }
    updateCenters()
    const ro = new ResizeObserver(updateCenters)
    ro.observe(el)
    return () => ro.disconnect()
  }, [size])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    wakeUp()
    if (skipTracking) return
    cancelAnimationFrame(eyeRafRef.current)
    eyeRafRef.current = requestAnimationFrame(() => {
      const { leftX, rightX, eyeCenterY } = eyeCentersRef.current
      const max = 4
      const clamp = (v: number) => Math.max(-max, Math.min(max, v))
      const targetForEye = (centerX: number) => {
        const dx = e.clientX - centerX
        const dy = e.clientY - eyeCenterY
        const dist = Math.sqrt(dx * dx + dy * dy)
        return { x: clamp(dx / Math.max(dist, 1) * max), y: clamp(dy / Math.max(dist, 1) * max) }
      }
      const left = targetForEye(leftX)
      const right = targetForEye(rightX)
      if (Math.abs(left.x - prevEyeRef.current.leftX) < 0.3 &&
          Math.abs(left.y - prevEyeRef.current.leftY) < 0.3) return
      prevEyeRef.current = { leftX: left.x, leftY: left.y }
      setEyeTarget({ leftX: left.x, leftY: left.y, rightX: right.x, rightY: right.y })
      setCursorSeen(true)
    })
  }, [skipTracking, wakeUp])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (skipTracking) setCursorSeen(false) }, [skipTracking])

  const eyeShiftLeft = cursorSeen ? eyeTarget.leftX : mood === 'pointing' ? 1.5 : 0
  const pupilYLeft = cursorSeen ? eyeTarget.leftY : mood === 'pointing' ? -1 : 0
  const eyeShiftRight = cursorSeen ? eyeTarget.rightX : mood === 'pointing' ? 1.5 : 0
  const pupilYRight = cursorSeen ? eyeTarget.rightY : mood === 'pointing' ? -1 : 0

  const accent =
    mood === 'celebrating' ? '#98c379' :
    mood === 'happy'       ? '#98c379' :
    mood === 'amazed'      ? '#61afef' :
    mood === 'pointing'    ? '#e5c07b' :
    mood === 'talking'     ? '#61afef' :
    mood === 'thinking'    ? '#61afef' :
    mood === 'error'       ? '#e06c75' :
    mood === 'confused'    ? '#e5c07b' :
    mood === 'tired'       ? '#848a97' :
    mood === 'sleeping'    ? '#848a97' :
                              '#848a97'

  // Mensaje a mostrar: el actual, o el recordado si el usuario hizo click en idle
  const displayMessage = showRecalledMessage && lastMessage ? lastMessage : message
  const showBubble = !dismissed && (displayMessage || mode === 'off')
  const showButton = !dismissed && (onConfirmStep || onInjectGuided) && !showRecalledMessage

  // Click en Cody (idle): recordar último mensaje
  const handleCodyClick = useCallback(() => {
    if (mood === 'idle' && lastMessage && !showRecalledMessage) {
      setShowRecalledMessage(true)
      setDismissed(false)
    } else if (showRecalledMessage) {
      setShowRecalledMessage(false)
      setDismissed(true)
    }
  }, [mood, lastMessage, showRecalledMessage])

  // Animación CSS inyectada una sola vez
  useEffect(() => {
    const styleId = 'cody-animations'
    if (document.getElementById(styleId)) return
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes cody-bounce { 0%{transform:translateY(0)} 30%{transform:translateY(-6px)} 60%{transform:translateY(2px)} 100%{transform:translateY(0)} }
      @keyframes cody-shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-2px)} 40%{transform:translateX(2px)} 60%{transform:translateX(-1px)} 80%{transform:translateX(1px)} }
      @keyframes cody-particle { 0%{opacity:1;transform:translate(0,0) rotate(0)} 100%{opacity:0;transform:translate(var(--px),var(--py)) rotate(var(--rot))} }
      @keyframes cody-bubble-in { from{opacity:0;transform:translateY(8px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes cody-think { 0%,100%{opacity:0.3;transform:translateY(0)} 50%{opacity:1;transform:translateY(-2px)} }
      @keyframes cody-wiggle { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-3deg)} 75%{transform:rotate(3deg)} }
      @keyframes cody-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
      @keyframes cody-z-float { 0%{opacity:0;transform:translate(0,2px) scale(0.8)} 20%{opacity:1} 100%{opacity:0;transform:translate(10px,-12px) scale(1.3)} }
    `
    document.head.appendChild(style)
    return () => { document.getElementById(styleId)?.remove() }
  }, [])

  const codyAnim =
    bounce ? 'cody-bounce 0.4s ease' :
    angryOnTest ? 'cody-shake 0.3s ease infinite' :
    mood === 'error' ? 'cody-shake 0.4s ease infinite' :
    mood === 'thinking' ? 'cody-bounce 0.6s ease infinite' :
    mood === 'happy' ? 'cody-pulse 1.2s ease infinite' :
    mood === 'confused' ? 'cody-wiggle 0.5s ease' :
    mood === 'tired' ? undefined :
    mood === 'amazed' ? 'cody-bounce 0.8s ease' :
    undefined

  return (
    <div style={{
      position: 'fixed',
      right: 12,
      bottom: 12,
      zIndex: 200,
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
      fontFamily: "'JetBrains Mono', monospace",
      pointerEvents: showBubble ? 'auto' : 'auto',
      transition: 'right 0.3s ease, bottom 0.3s ease',
    }}>
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
              animation: 'cody-particle 1.4s ease-out forwards',
            }}>{p.emoji}</span>
          ))}
        </div>
      )}

      {showBubble && (
        <div style={{
          backgroundColor: '#1e2229',
          border: `1px solid ${accent}55`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: 8,
          padding: '8px 12px',
          maxWidth: 280,
          minWidth: 180,
          position: 'relative',
          opacity: 1,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          pointerEvents: 'auto',
          animation: 'cody-bubble-in 0.2s ease',
        }}>
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

          <div style={{ fontSize: 14, color: '#f2f4f8', lineHeight: 1.5, opacity: 1, fontWeight: 500 }}>
            {mode === 'off' && !displayMessage
              ? <span style={{ color: '#4b5263', fontStyle: 'italic' }}>…</span>
              : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(displayMessage ?? '') }} />}
          </div>

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

          <button
            onClick={() => {
              if (showRecalledMessage) {
                setShowRecalledMessage(false)
              }
              setDismissed(true)
            }}
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

      {/* Cody SVG siempre visible */}
      <div
        ref={codyRef}
        onClick={handleCodyClick}
        style={{
          pointerEvents: 'auto',
          animation: codyAnim,
          position: 'relative',
          width: size,
          height: size,
          transition: 'width 0.3s ease, height 0.3s ease',
          cursor: mood === 'idle' && lastMessage ? 'pointer' : 'default',
        }}>
        <CodySvg
          mood={mood}
          blink={blink}
          eyeShiftLeft={eyeShiftLeft}
          pupilYLeft={pupilYLeft}
          eyeShiftRight={eyeShiftRight}
          pupilYRight={pupilYRight}
          accent={accent}
        />
      </div>
    </div>
  )
}

function btnStyle(accent: string): React.CSSProperties {
  return {
    padding: '5px 10px',
    background: `${accent}1a`,
    color: accent,
    border: `1px solid ${accent}55`,
    borderRadius: 4,
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    textTransform: 'uppercase',
  }
}

/* ── Cejas ) ( para expresiones ──
   Las cejas son curvas simples sobre cada ojo:
   - happy/celebrating: ) (  (hacia arriba, sonrisa)
   - confused: ( )       (asimétrico, una arriba una abajo)
   - amazed: ( (          (ambas arriba, asombro)
   - error: ) )           (ambas abajo, enojo) */
function Eyebrows({ mood, color }: { mood: Mood; color: string }) {
  if (mood === 'idle' || mood === 'talking' || mood === 'pointing' || mood === 'sleeping' || mood === 'thinking') return null
  const stroke = color
  const sw = 2
  // Ojo izquierdo ~ x=20, ojo derecho ~ x=50, cejas a y=24 (encima de los ojos a y=34)
  if (mood === 'celebrating' || mood === 'happy') {
    // ) (  — curvas hacia arriba (sonrisa/contento)
    return (
      <g stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round">
        <path d="M15 26 Q20 21 25 26" />
        <path d="M45 26 Q50 21 55 26" />
      </g>
    )
  }
  if (mood === 'confused') {
    // ( )  — asimétrico: izquierda abajo, derecha arriba
    return (
      <g stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round">
        <path d="M15 24 Q20 28 25 24" />
        <path d="M45 26 Q50 21 55 26" />
      </g>
    )
  }
  if (mood === 'amazed') {
    // ( (  — ambas arriba (asombro)
    return (
      <g stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round">
        <path d="M15 24 Q20 19 25 24" />
        <path d="M45 24 Q50 19 55 24" />
      </g>
    )
  }
  if (mood === 'error') {
    // ) )  — ambas hacia abajo/centro (enojo)
    return (
      <g stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round">
        <path d="M15 24 Q20 28 25 24" />
        <path d="M45 24 Q50 28 55 24" />
      </g>
    )
  }
  if (mood === 'tired') {
    // \ \  — ligeramente hacia abajo (cansancio)
    return (
      <g stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round">
        <path d="M15 25 Q20 27 25 25" />
        <path d="M45 25 Q50 27 55 25" />
      </g>
    )
  }
  return null
}

/* Diseño: dos lentes circulares conectados por un puente,
   con ojos expresivos que se mueven. Sin patas (no es copyright de Pixar).
   Color del cuerpo: gris por defecto, el accent (ojos/anillos) cambia con mood. */
function CodySvg({
  mood, blink, eyeShiftLeft, pupilYLeft, eyeShiftRight, pupilYRight, accent,
}: {
  mood: Mood
  blink: boolean
  eyeShiftLeft: number
  pupilYLeft: number
  eyeShiftRight: number
  pupilYRight: number
  accent: string
}) {
  // Párpados felices (anime ^_^) para happy/celebrating: ojos cerrados curva hacia arriba
  const tiredEyes = mood === 'tired'
  const happyEyes = mood === 'happy' || mood === 'celebrating'
  const eyeOpen = !blink && mood !== 'sleeping' && mood !== 'thinking' && !happyEyes && !tiredEyes
  const bodyGray = '#00000000'
  const bodyGrayDark = '#00000000'
  const bodyGrayLight = '#00000000'
  const ringColor = mood === 'error' ? '#e06c75' : accent

  return (
    <svg
      width="100%" height="100%" viewBox="0 0 70 56"
      style={{ filter: 'none' }}
    >
      <defs>
        <radialGradient id="cody-body" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor={bodyGrayLight} />
          <stop offset="60%" stopColor={bodyGray} />
          <stop offset="100%" stopColor={bodyGrayDark} />
        </radialGradient>
        <radialGradient id="cody-lens" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#1a1e24" />
          <stop offset="100%" stopColor="#0a0d1200" />
        </radialGradient>
        <radialGradient id="cody-shine" cx="0.3" cy="0.25" r="0.4">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ── Dos lentes circulares (el binocular) ── */}
      <circle cx="20" cy="34" r="14" fill="url(#cody-body)" stroke={ringColor} strokeWidth="2" />
      <circle cx="50" cy="34" r="14" fill="url(#cody-body)" stroke={ringColor} strokeWidth="2" />
      <rect x="31" y="31" width="2" height="6" rx="1" fill={bodyGrayDark} />

      {/* ── Vidrio de los lentes ── */}
      <circle cx="20" cy="34" r="10" fill="url(#cody-lens)" stroke={ringColor} strokeWidth="0.8" />
      <circle cx="50" cy="34" r="10" fill="url(#cody-lens)" stroke={ringColor} strokeWidth="0.8" />
      <circle cx="20" cy="34" r="10" fill="url(#cody-shine)" />
      <circle cx="50" cy="34" r="10" fill="url(#cody-shine)" />

      {/* ── Cejas ) ( según mood ── */}
      <Eyebrows mood={mood} color={ringColor} />

      {/* ── Ojos / pupilas ── */}
      {eyeOpen ? (
        <>
          <circle cx={20 + eyeShiftLeft} cy={34 + pupilYLeft} r="4.5" fill={accent} />
          <circle cx={50 + eyeShiftRight} cy={34 + pupilYRight} r="4.5" fill={accent} />
          <circle cx={20 + eyeShiftLeft + 1.5} cy={34 + pupilYLeft - 1.5} r="1.4" fill="#ffffff" opacity="0.9" />
          <circle cx={50 + eyeShiftRight + 1.5} cy={34 + pupilYRight - 1.5} r="1.4" fill="#ffffff" opacity="0.9" />
          <circle cx={20 + eyeShiftLeft - 1} cy={34 + pupilYLeft + 1.5} r="0.6" fill="#ffffff" opacity="0.6" />
          <circle cx={50 + eyeShiftRight - 1} cy={34 + pupilYRight + 1.5} r="0.6" fill="#ffffff" opacity="0.6" />
        </>
      ) : happyEyes ? (
        /* Párpados felices estilo anime ^_^ — curvas hacia arriba */
        <>
          <path d="M15 36 Q20 30 25 36" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M45 36 Q50 30 55 36" stroke={accent} strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      ) : tiredEyes ? (
        /* Ojos cansados — líneas cortas, entreabiertos */
        <>
          <line x1="17" y1="35.5" x2="23" y2="34.5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="47" y1="35.5" x2="53" y2="34.5" stroke={accent} strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        /* Párpados normales cerrados (sleeping/blink) */
        <>
          <path d="M15 34 Q20 37 25 34" stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M45 34 Q50 37 55 34" stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      )}

      {/* ── Expresiones decorativas según mood ── */}
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

      {mood === 'amazed' && (
        <g fill="#61afef">
          <circle cx="32" cy="8" r="2.5" />
        </g>
      )}

      {mood === 'pointing' && (
        <g stroke="#e5c07b" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M28 3 L32 8 L36 3" />
        </g>
      )}

      {mood === 'sleeping' && (
        <g fontFamily="'JetBrains Mono', monospace" fontWeight="700" fill="#848a97">
          <text x="44" y="14" fontSize="10" style={{ animation: 'cody-z-float 3s ease infinite' }}>z</text>
          <text x="44" y="14" fontSize="10" style={{ animation: 'cody-z-float 3s ease 1s infinite' }}>z</text>
          <text x="44" y="14" fontSize="10" style={{ animation: 'cody-z-float 3s ease 2s infinite' }}>z</text>
        </g>
      )}

      {mood === 'tired' && (
        <text x="35" y="12" fontSize="9" fill="#848a97" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">...</text>
      )}

      {mood === 'thinking' && (
        <>
          <circle cx={20} cy={34} r="4.5" fill="#61afef" opacity="0.5" />
          <circle cx={50} cy={34} r="4.5" fill="#61afef" opacity="0.5" />
          <text x="28" y="16" fontSize="6" fill="#61afef" fontFamily="'JetBrains Mono', monospace" fontWeight="700" opacity="0.7">
            <tspan x="30" dy="0" style={{animation: 'cody-think 0.8s ease infinite'}}>·</tspan>
            <tspan x="33" dy="0" style={{animation: 'cody-think 0.8s ease 0.2s infinite'}}>·</tspan>
            <tspan x="36" dy="0" style={{animation: 'cody-think 0.8s ease 0.4s infinite'}}>·</tspan>
          </text>
        </>
      )}
    </svg>
  )
}
