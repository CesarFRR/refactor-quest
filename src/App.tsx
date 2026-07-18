import './styles/global.css'
import { SmellPanel } from './components/SmellPanel'
import { EditorPanel } from './components/EditorPanel'
import { LevelComplete } from './components/LevelComplete'
import { LevelSelect } from './components/LevelSelect'
import { StartMenu } from './components/StartMenu'
import { LennyAvatar } from './components/LennyAvatar'
import { useGameState } from './hooks/useGameState'
import { useTestRunner } from './hooks/useTestRunner'
import { levels } from './utils/loadLevel'
import { useEffect, useRef, useCallback, useState } from 'react'
import type { SyntaxMarker } from './types'

const STORAGE_KEY = 'refactorquest-state'

function loadPersistedState(): {
  screen: 'menu' | 'select' | 'game'
  currentLevelIndex: number
  unlockedIds: number[]
} {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('no state')
    const parsed = JSON.parse(raw)
    return {
      screen: parsed.screen ?? 'menu',
      currentLevelIndex: Math.min(parsed.currentLevelIndex ?? 0, levels.length - 1),
      unlockedIds: Array.isArray(parsed.unlockedIds) ? parsed.unlockedIds : [levels[0]?.id].filter(x => x != null),
    }
  } catch {
    return {
      screen: 'menu',
      currentLevelIndex: 0,
      unlockedIds: [levels[0]?.id].filter(x => x != null),
    }
  }
}

export default function App() {
  const persisted = useRef(loadPersistedState())
  const [screen, setScreen] = useState<'menu' | 'select' | 'game'>(persisted.current.screen)
  const [currentLevelIndex, setCurrentLevelIndex] = useState(persisted.current.currentLevelIndex)
  const [unlockedLevels, setUnlockedLevels] = useState<Set<number>>(() => {
    const first = levels[0]?.id
    const base = new Set(first == null ? [] : [first])
    for (const id of persisted.current.unlockedIds) base.add(id)
    return base
  })

  // Persistir estado en sessionStorage (sobrevive a F5, se borra al cerrar pestaña)
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        screen,
        currentLevelIndex,
        unlockedIds: [...unlockedLevels],
      }))
    } catch { /* sessionStorage no disponible */ }
  }, [screen, currentLevelIndex, unlockedLevels])
  const currentLevel = levels[currentLevelIndex]
  const { state, updateCode, applyTestResults, levelCompleted, loadSolution, resetLevel,
          setCompileStatus, injectGuidedSmell, confirmAvatarStep } =
    useGameState(currentLevel)
  const { results, running, compileStatus, syntaxError, syntaxErrorLine,
          runTests, compileCode, clearResults, clearCompile, resetAll } = useTestRunner()
  const prevRunning = useRef(running)
  const prevLevelId = useState<number>(currentLevel.id)
  const justChangedLevel = useRef(false)

  // ── Reset sincrónico al cambiar de nivel (adjust-during-render con useState) ──
  // Limpia results y compileStatus del nivel anterior para que no se reapliquen
  // sobre el nivel nuevo. Las mutaciones de refs y side-effects van en un effect.
  if (prevLevelId[0] !== currentLevel.id) {
    prevLevelId[1](currentLevel.id)
    clearResults()    // setState — seguro durante render
    clearCompile()    // setState — seguro durante render
  }

  const handleNextLevel = useCallback(() => {
    setCurrentLevelIndex(i => {
      const next = Math.min(i + 1, levels.length - 1)
      const nextLevel = levels[next]
      if (nextLevel) {
        setUnlockedLevels(prev => new Set(prev).add(nextLevel.id))
      }
      return next
    })
  }, [])

  const handleRunTests = useCallback(() => {
    runTests(state.code, currentLevel.tests)
  }, [state.code, currentLevel.tests, runTests])

  // ── Capa 2: compilar al cambiar el código (debounce interno del hook) ──
  const handleCodeChange = useCallback((code: string) => {
    updateCode(code)
    compileCode(code)
  }, [updateCode, compileCode])

  // ── Capa 1 (Monaco) → sincroniza compileStatus si hay errores de sintaxis ──
  const handleMarkersChange = useCallback((markers: SyntaxMarker[]) => {
    const errors = markers.filter(m => m.severity === 'error')
    if (errors.length > 0) {
      setCompileStatus('syntax-error', errors[0]?.message, markers)
    } else if (compileStatus === 'syntax-error') {
      // Sin errores marcados: el worker lo confirmará con COMPILE_CHECK
      setCompileStatus('idle', undefined, markers)
    }
  }, [compileStatus, setCompileStatus])

  // ── Sincronizar compileStatus del hook useTestRunner → estado global ──
  useEffect(() => {
    setCompileStatus(compileStatus, syntaxError)
  }, [compileStatus, syntaxError, setCompileStatus])

  // ── Reset al cambiar de nivel: side-effects + refs (no durante render) ──
  useEffect(() => {
    prevRunning.current = false
    justChangedLevel.current = true
    resetAll()  // termina worker, cancela timers, limpia seq
    // Compilar el código inicial para que el estado de sintaxis sea correcto
    // desde el primer momento (evita que Monaco reporte errores transitorios
    // que nunca se rescatan porque nadie llama compileCode tras el mount).
    compileCode(currentLevel.initialCode)
  }, [currentLevel, resetAll, compileCode])

  // ── Aplicar resultados cuando terminan ──
  // Guard: sólo aplica si los test ids coinciden con los del nivel actual,
  // para evitar que results del nivel anterior "completen" el nuevo.
  const currentTestIds = currentLevel.tests.map(t => t.id).join(',')
  useEffect(() => {
    if (justChangedLevel.current) {
      // Consumir el flag: en el primer effect-run tras cambio de nivel, no aplicar
      justChangedLevel.current = false
      prevRunning.current = running
      return
    }
    if (prevRunning.current && !running && results.length > 0) {
      const resultIds = results.map(r => r.testId).join(',')
      if (resultIds === currentTestIds) {
        applyTestResults(results)
      }
    }
    prevRunning.current = running
  }, [running, results, applyTestResults, currentTestIds])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        loadSolution()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [loadSolution])

  const handleGoBack = useCallback(() => {
    setScreen('select')
  }, [])

  const handleResetLevel = useCallback(() => {
    resetLevel()
    resetAll()
    prevRunning.current = false
  }, [resetLevel, resetAll])

  const passedCount = results.filter((r) => r.passed).length
  const totalTests = currentLevel.tests.length

  // ── Footer: estado de las 3 capas ──
  const syntaxBadge = compileStatus === 'ok'
    ? { label: 'Sintaxis', value: '✓ OK', color: '#98c379' }
    : compileStatus === 'syntax-error'
      ? { label: 'Sintaxis', value: `✗ ${syntaxErrorLine ? `L${syntaxErrorLine}` : 'error'}`, color: '#e06c75' }
      : { label: 'Sintaxis', value: '—', color: '#636d83' }

  const compileBadge = compileStatus === 'ok'
    ? { label: 'Compila', value: '✓ listo', color: '#98c379' }
    : { label: 'Compila', value: compileStatus === 'syntax-error' ? '✗ no' : '—', color: compileStatus === 'syntax-error' ? '#e06c75' : '#636d83' }

  const testsBadge = results.length > 0
    ? { label: 'Tests', value: `${passedCount}/${totalTests}`, color: passedCount === totalTests ? '#98c379' : '#e5c07b' }
    : { label: 'Tests', value: '—', color: '#636d83' }

  // ── Avatar: configuración de botones según modo ──
  // Sólo mostrar botones si el avatar está activo.
  const tutorial = currentLevel.tutorial
  const avatarMode = tutorial?.avatarMode ?? 'off'
  const isLastStep = tutorial?.steps
    ? state.avatarStep >= tutorial.steps.length - 1
    : true

  const confirmLabel = !state.avatarActive ? undefined :
    avatarMode === 'reveal-solution' ? (isLastStep ? '✓ Terminar' : 'Siguiente paso ▶') :
    avatarMode === 'walkthrough' ? (isLastStep ? '✓ Entendido' : 'Siguiente ▶') :
    undefined

  const injectLabel =
    avatarMode === 'guided-smell' && state.avatarActive ? 'Deja que Lenny ayude 🤝' : undefined

  if (screen === 'menu') {
    return <StartMenu onStart={() => setScreen('select')} levelCount={levels.length} />
  }

  if (screen === 'select') {
    return (
      <LevelSelect
        levels={levels}
        unlockedLevels={unlockedLevels}
        onSelectLevel={(i) => { setCurrentLevelIndex(i); setScreen('game') }}
        onBack={() => setScreen('menu')}
      />
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Barra superior ── */}
      <header style={{
        height: 40,
        background: '#181a1f',
        borderBottom: '1px solid #0d0f12',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {['#e06c75', '#e5c07b', '#98c379'].map((c) => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
          ))}
          <span style={{
            fontSize: 11, fontWeight: 700, color: '#98c379', cursor: 'pointer',
            letterSpacing: '0.06em', padding: '4px 8px', borderRadius: 3,
          }}
            onClick={() => setScreen('menu')}
            onMouseEnter={e => { e.currentTarget.style.color = '#abb2bf' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#98c379' }}
          >
            RQ
          </span>
          <span style={{
            fontSize: 11, color: '#4b5263', cursor: 'pointer',
            letterSpacing: '0.04em', padding: '4px 8px', borderRadius: 3,
          }}
            onClick={handleGoBack}
            onMouseEnter={e => { e.currentTarget.style.color = '#61afef'; e.currentTarget.style.background = '#2c313a' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#4b5263'; e.currentTarget.style.background = 'transparent' }}
          >
            ← Volver
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#636d83', letterSpacing: '0.04em' }}>
            Nivel {currentLevel.id} — {currentLevel.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Stat label="Tests" value={`${passedCount}/${totalTests}`} />
          <Stat label="Intentos" value={state.attempts} />
          <Stat
            label="Estabilidad"
            value={`${state.stability}%`}
            color={state.stability >= 70 ? '#98c379' : state.stability >= 40 ? '#e5c07b' : '#e06c75'}
          />
        </div>
      </header>

      {/* ── Cuerpo: panel + editor ── */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <SmellPanel
          level={currentLevel}
          state={{ ...state, testResults: results }}
          onRunTests={handleRunTests}
          running={running}
          locked={state.interactiveLock}
        />
        <div style={{ position: 'relative', flex: 1 }}>
          <EditorPanel
            code={state.code}
            smells={currentLevel.smells}
            onChange={handleCodeChange}
            onMarkersChange={handleMarkersChange}
            readOnly={state.interactiveLock}
          />
          {/* Rectángulo de resalte Z-INDEX ALTO sobre el editor */}
          {state.avatarHighlightLine && state.avatarMessage && (
            <div style={{
              position: 'absolute', inset: 0,
              border: '2px solid rgba(97,175,239,0.4)',
              borderRadius: 4,
              pointerEvents: 'none',
              zIndex: 99999,
              background: 'rgba(97,175,239,0.04)',
              boxShadow: 'inset 0 0 40px rgba(97,175,239,0.1), 0 0 30px rgba(97,175,239,0.08)',
            }} />
          )}
        </div>
      </main>

      {/* ── Barra inferior: 3 capas de inmediatez ── */}
      <footer style={{
        height: 32,
        background: '#181a1f',
        borderTop: '1px solid #0d0f12',
        display: 'flex',
        alignItems: 'center',
        padding: '10px 16px',
        gap: 20,
        flexShrink: 0,
      }}>
        <Stat label={syntaxBadge.label} value={syntaxBadge.value} color={syntaxBadge.color} />
        <Stat label={compileBadge.label} value={compileBadge.value} color={compileBadge.color} />
        <Stat label={testsBadge.label} value={testsBadge.value} color={testsBadge.color} />
        <Stat label="Fase" value={state.phase} color="#61afef" />
        <div style={{ flex: 1 }} />
        {syntaxError && (
          <span style={{ fontSize: 10, color: '#e06c75', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {syntaxError}
          </span>
        )}
        <span style={{ fontSize: 10, color: '#4b5263' }}>
          Ctrl+Shift+S — cargar solución
        </span>
      </footer>

      {/* ── Overlay sutil cuando Lenny señala algo ── */}
      {state.avatarMessage && state.avatarHighlightLine && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.08)',
          zIndex: 50,
          pointerEvents: 'none',
        }} />
      )}

      {/* ── Avatar Lenny — asistente flotante abajo-derecha ── */}
      {avatarMode !== 'off' && (
        <LennyAvatar
          mode={avatarMode}
          message={state.avatarMessage}
          highlightLine={state.avatarHighlightLine}
          compileStatus={state.compileStatus}
          zone={state.avatarZone}
          onConfirmStep={confirmLabel ? confirmAvatarStep : undefined}
          confirmLabel={confirmLabel}
          onInjectGuided={injectLabel ? injectGuidedSmell : undefined}
          injectLabel={injectLabel}
        />
      )}

      {levelCompleted && (
        <LevelComplete
          level={currentLevel}
          state={{ ...state, testResults: results }}
          onReplay={handleResetLevel}
          onNextLevel={currentLevelIndex < levels.length - 1 ? handleNextLevel : undefined}
          nextLevel={levels[currentLevelIndex + 1]}
        />
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <span style={{ fontSize: 12, color: '#636d83', display: 'flex', alignItems: 'center', gap: 5 }}>
      {label}:
      <strong style={{ color: color ?? '#61afef', fontWeight: 600 }}>{value}</strong>
    </span>
  )
}
