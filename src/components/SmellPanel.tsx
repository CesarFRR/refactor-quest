import { useState, useCallback, useRef, useEffect } from 'react'
import type { GameState, Level, ZoneId } from '../types'

interface Props {
  level: Level
  state: GameState
  onRunTests: () => void
  running: boolean
  /** Si true, bloquea la interacción (tutorial de Cody) */
  locked?: boolean
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#e06c75',
  warning:  '#e5c07b',
  info:     '#61afef',
}

const MIN_PANEL_WIDTH = 200
const MAX_PANEL_WIDTH = 600

function calcInitialWidth(): number {
  if (typeof window === 'undefined') return 360
  return Math.min(Math.max(360, Math.round(window.innerWidth * 0.28)), 500)
}

export function SmellPanel({ level, state, onRunTests, running, locked }: Props) {
  const [panelWidth, setPanelWidth] = useState(calcInitialWidth)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = panelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth])

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging.current) return
    const newW = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, startW.current + (e.clientX - startX.current)))
    setPanelWidth(newW)
  }, [])

  const onMouseUp = useCallback(() => {
    if (!dragging.current) return
    dragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const allPassed = state.testResults.length > 0 && state.testResults.every((r) => r.passed)
  const allSmellsFixed = level.smells.length === 0
    || level.smells.every(s => state.smellStatus[s.id] === 'fixed')
  // 'won' debe coincidir EXACTAMENTE con 'isComplete' de useGameState.applyTestResults
  const won = allPassed && allSmellsFixed && state.stability >= 75 && state.code !== level.initialCode
  const codeChanged = state.code !== level.initialCode
  // Tests bloqueados si: Codygo sin cambios, syntax error, ya corriendo, locked, o smellScore < 0.5
  const testsLocked = (state.smellScore ?? 0) < 0.5
  // Nivel 0: el usuario no edita código (demo), pero puede ejecutar tests tras la inyección
  const isDemoLevel = level.id === 0
  const canRun = (isDemoLevel || codeChanged) && !running && !locked && !testsLocked

  return (
    <aside className="rq-panel" style={{
      width: panelWidth,
      flexShrink: 0,
      background: '#21252b',
      borderRight: '1px solid #181a1f',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Overlay de bloqueo durante tutorial de Cody */}
      {locked && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 100,
          pointerEvents: 'none',
        }} />
      )}
      {/* ── Contenido scrolleable ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Section label="Misión" color="#e5c07b" zoneId="mission">
          <p style={{ margin: 0, color: '#abb2bf', fontSize: 15, lineHeight: 1.6 }}>
            {level.narrative}
          </p>
        </Section>

        <Section label="Smells detectados" zoneId="smells-list">
          {(() => {
            // Agrupar smells por nombre
            const groups: Record<string, { smells: typeof level.smells; severity: 'critical' | 'warning' }> = {}
            for (const s of level.smells) {
              if (!groups[s.name]) groups[s.name] = { smells: [], severity: s.severity }
              groups[s.name].smells.push(s)
            }
            return Object.entries(groups).map(([name, g]) => {
              const remaining = g.smells.filter(s => state.smellStatus[s.id] !== 'fixed').length
              const partial = g.smells.some(s => state.smellStatus[s.id] === 'partial')
              const allFixed = remaining === 0
              const progress = g.smells.reduce((acc, s) => acc + (state.smellProgress[s.id] ?? 0), 0) / g.smells.length
              return (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 14 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: allFixed ? '#98c379' : partial ? '#e5c07b' : SEVERITY_COLOR[g.severity],
                  }} />
                  <span style={{
                    flex: 1, color: allFixed ? '#636d83' : '#abb2bf',
                    textDecoration: allFixed ? 'line-through' : 'none',
                  }}>
                    {name} <span style={{ color: '#636d83', fontWeight: 400 }}>({g.smells.length})</span>
                  </span>
                  {allFixed ? (
                    <span style={{ fontSize: 14, color: '#98c379', fontWeight: 600 }}>✓</span>
                  ) : partial ? (
                    <span style={{
                      fontSize: 11, padding: '1px 5px', borderRadius: 3, fontWeight: 500,
                      background: 'rgba(229,192,123,0.12)', color: '#e5c07b',
                    }}>
                      {Math.round(progress * 100)}%
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 11, padding: '1px 5px', borderRadius: 3, fontWeight: 500,
                      background: g.severity === 'critical' ? 'rgba(224,108,117,0.12)' : 'rgba(229,192,123,0.12)',
                      color: SEVERITY_COLOR[g.severity],
                    }}>
                      {g.severity === 'critical' ? 'crítico' : 'warning'}
                    </span>
                  )}
                </div>
              )
            })
          })()}
        </Section>

        <Section label="Estabilidad del sistema" zoneId="stability">
          <StabilityBar value={state.stability} />
        </Section>



        <Section label="Energía disponible" zoneId="energy">
          <span style={{
            fontSize: 15, fontWeight: 600,
            color: state.energy <= 2 ? '#e06c75' : state.energy <= 5 ? '#e5c07b' : '#98c379',
          }}>
            {state.energy} / {level.energyBudget} ⚡
          </span>
        </Section>

        {level.smells.some(s => state.smellStatus[s.id] !== 'fixed') && (
          <Section label={`Sugerencia ${codeChanged ? '' : '— opcional'}`} zoneId="suggestion">
            {(() => {
              // Generar sugerencia según el smell principal del nivel
              const SUGGESTIONS: Record<string, { technique: string; tagline: string; detail: string }> = {
                'Magic Numbers': {
                  technique: 'Replace Magic Number',
                  tagline: 'números con nombre',
                  detail: 'Reemplaza los literales numéricos por constantes con nombre (const IVA = 0.19).',
                },
                'Long Method': {
                  technique: 'Extract Method',
                  tagline: 'divide y vencerás',
                  detail: 'Extrae funciones helper para cada responsabilidad dentro del método largo.',
                },
                'Duplicate Code': {
                  technique: 'DRY — Don\'t Repeat Yourself',
                  tagline: 'una sola fuente de verdad',
                  detail: 'Identifica bloques repetidos y extrae una función compartida.',
                },
              }
              // Tomar el primer smell no-arreglado como referencia
              const pending = level.smells.find(s => state.smellStatus[s.id] !== 'fixed')
              const sug = pending ? SUGGESTIONS[pending.name] : null
              if (!sug) return null
              return (
                <div style={{
                  background: '#2c313a',
                  borderRadius: 5, padding: '8px 10px',
                  borderLeft: '2px solid #61afef',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#61afef', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
                    {sug.technique}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#abb2bf', marginBottom: 4 }}>
                    {sug.tagline}
                  </div>
                  <div style={{ fontSize: 12, color: '#5c6370', lineHeight: 1.5 }}>
                    {sug.detail}
                  </div>
                </div>
              )
            })()}
          </Section>
        )}
      </div>

      {/* ── Botón + resultados — siempre visible ── */}
      <div style={{ padding: '12px 18px', borderTop: '1px solid #2c313a' }}>
        {!codeChanged && !isDemoLevel && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#e5c07b', textAlign: 'center' }}>
            Edita el código antes de ejecutar tests
          </p>
        )}
        {testsLocked && codeChanged && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#e5c07b', textAlign: 'center' }}>
            Refactoriza al 50% para desbloquear tests ({Math.round((state.smellScore ?? 0) * 100)}%)
          </p>
        )}
        <button
          data-zone="run-tests"
          onClick={onRunTests}
          disabled={!canRun}
          title={testsLocked ? 'Completa al menos la mitad del refactor para desbloquear' : 'Ejecutar pruebas'}
          style={{
            width: '100%',
            padding: '9px 0',
            background: won ? '#98c379' : canRun ? '#61afef' : '#2c313a',
            color: canRun ? '#1e2127' : '#636d83',
            border: 'none',
            borderRadius: 4,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 14,
            cursor: canRun ? 'pointer' : 'not-allowed',
            opacity: running ? 0.7 : 1,
          }}
        >
          {running ? '⏳ Ejecutando…' :
           won ? '✓ Ejecutar tests' :
           '▶ Ejecutar tests'}
        </button>

        {state.testResults.length > 0 && (
          <div data-zone="test-results" style={{ marginTop: 8 }}>
            {state.testResults.map((r) => (
              <div key={r.testId} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
                <span style={{ color: r.passed ? '#98c379' : '#e06c75', flexShrink: 0, fontSize: 14 }}>
                  {r.passed ? '✓' : '✗'}
                </span>
                <span style={{ fontSize: 12, color: '#636d83', lineHeight: 1.4 }}>
                  {r.testId}
                  {!r.passed && r.error && (
                    <span style={{ display: 'block', color: '#e06c75', marginTop: 2 }}>
                      {r.error}
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}

        {state.testResults.length > 0 && !won && (
          <p style={{ marginTop: 8, marginBottom: 0, fontSize: 12, color: '#e5c07b' }}>
            Intenta otra estrategia.
          </p>
        )}
      </div>

      {/* ── Resize handle ── */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: 'absolute',
          top: 0, right: 0,
          width: 4,
          height: '100%',
          cursor: 'col-resize',
          zIndex: 10,
        }}
      />
    </aside>
  )
}

function Section({ label, children, color, zoneId }: { label: string; children: React.ReactNode; color?: string; zoneId?: ZoneId }) {
  return (
    <div {...(zoneId ? { 'data-zone': zoneId } : {})} style={{ padding: '12px 18px', borderBottom: '1px solid #2c313a' }}>
      <div style={{
        fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
        color: color ?? '#636d83', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function StabilityBar({ value }: { value: number }) {
  const color = value >= 70 ? '#98c379' : value >= 40 ? '#e5c07b' : '#e06c75'
  return (
    <div>
      <div style={{ height: 6, background: '#2c313a', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          width: `${value}%`, height: '100%',
          background: color, borderRadius: 3, transition: 'width 400ms ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 13, color, fontWeight: 600 }}>{value}%</span>
        <span style={{ fontSize: 12, color: '#636d83' }}>
          {value >= 70 ? 'estable' : value >= 40 ? 'degradado' : 'crítico'}
        </span>
      </div>
    </div>
  )
}


