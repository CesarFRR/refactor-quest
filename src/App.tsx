import './styles/global.css'
import { SmellPanel } from './components/SmellPanel'
import { EditorPanel } from './components/EditorPanel'
import { LevelComplete } from './components/LevelComplete'
import { LevelSelect } from './components/LevelSelect'
import { StartMenu } from './components/StartMenu'
import { useGameState } from './hooks/useGameState'
import { useTestRunner } from './hooks/useTestRunner'
import { levels } from './utils/loadLevel'
import { useEffect, useRef, useCallback, useState } from 'react'

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'select' | 'game'>('menu')
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0)
  const [unlockedLevels, setUnlockedLevels] = useState<Set<number>>(() => new Set([levels[0]?.id].filter(Boolean)))
  const currentLevel = levels[currentLevelIndex]
  const { state, updateCode, applyTestResults, levelCompleted, loadSolution, resetLevel } =
    useGameState(currentLevel)
  const { results, running, runTests, clearResults } = useTestRunner()
  const prevRunning = useRef(running)

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

  useEffect(() => {
    if (prevRunning.current && !running && results.length > 0) {
      applyTestResults(results)
    }
    prevRunning.current = running
  }, [running, results, applyTestResults])

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
    clearResults()
  }, [resetLevel, clearResults])

  const passedCount = results.filter((r) => r.passed).length
  const totalTests = currentLevel.tests.length

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
        padding: '0 16px',
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
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <SmellPanel
          level={currentLevel}
          state={{ ...state, testResults: results }}
          onRunTests={handleRunTests}
          running={running}
        />
        <EditorPanel
          code={state.code}
          smells={currentLevel.smells}
          onChange={updateCode}
        />
      </main>

      {/* ── Barra inferior ── */}
      <footer style={{
        height: 32,
        background: '#181a1f',
        borderTop: '1px solid #0d0f12',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 24,
        flexShrink: 0,
      }}>
        <Stat label="Fase" value={state.phase} color="#61afef" />
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#4b5263' }}>
          Ctrl+Shift+S — cargar solución
        </span>
      </footer>

      {levelCompleted && (
        <LevelComplete
          level={currentLevel}
          state={{ ...state, testResults: results }}
          onReplay={handleResetLevel}
          onNextLevel={currentLevelIndex < levels.length - 1 ? handleNextLevel : undefined}
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
