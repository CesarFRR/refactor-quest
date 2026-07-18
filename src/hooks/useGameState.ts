import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  GameState,
  TestResult,
  TelemetryEvent,
  SmellStatus,
  Level,
  CompileStatus,
  SyntaxMarker,
  AvatarZone,
} from '../types'

function initialState(level: Level): GameState {
  const smellStatus: Record<string, SmellStatus> = {}
  const smellProgress: Record<string, number> = {}
  level.smells.forEach((s) => {
    smellStatus[s.id] = 'pending'
    smellProgress[s.id] = 0
  })
  const tutorial = level.tutorial
  const firstStep = tutorial?.steps?.[0]
  const avatarActiveAtStart =
    tutorial != null && tutorial.avatarMode !== 'off'
  return {
    levelId: level.id,
    code: level.initialCode,
    smellStatus,
    smellProgress,
    energy: level.energyBudget,
    attempts: 0,
    stability: calcStability(smellProgress, [], level.smells.length),
    testResults: [],
    phase: 'diagnosis',
    compileStatus: 'idle',
    avatarStep: 0,
    avatarActive: avatarActiveAtStart,
    avatarMessage: firstStep?.trigger === 'level-start' ? firstStep.message : undefined,
    avatarHighlightLine: firstStep?.highlightLine,
    avatarHighlightZone: firstStep?.highlightZone,
    avatarCinematicBlur: firstStep?.cinematicBlur,
    avatarZone: firstStep?.zone ?? 'bottom-right',
    interactiveLock: firstStep?.interactiveLock ?? false,
  }
}

/**
 * Estabilidad del sistema — precisa e intuitiva:
 *   smells  = 50% del total (fracción real de progreso por smell)
 *   tests   = 50% del total (si no se han ejecutado, 0: no sabemos)
 *   total   = smells + tests, cap 100
 *
 * Nivel 0 al inicio (sin smells, sin tests): 50%
 * Nivel 0 tras pasar tests: 100%
 * Nivel 1 al arreglar 1 de 2 magic numbers: 0.5 * 50 = 25%
 * Nivel 1 tras arreglar ambos + tests OK: 50 + 50 = 100%
 */
function calcStability(
  smellProgress: Record<string, number>,
  testResults: TestResult[],
  totalSmells: number,
): number {
  let smellScore: number
  if (totalSmells === 0) {
    smellScore = 50  // no hay deuda
  } else {
    let sum = 0
    for (const key of Object.keys(smellProgress)) {
      sum += smellProgress[key] ?? 0
    }
    smellScore = (sum / totalSmells) * 50
  }
  const passed = testResults.filter((r) => r.passed).length
  const testScore = testResults.length > 0 ? (passed / testResults.length) * 50 : 0
  return Math.min(Math.round(smellScore + testScore), 100)
}

/** Recalcula el smellStatus y smellProgress a partir de los validators.
 *  Los validators devuelven 0-1: 0=pending, >0 y <1=partial, >=1=fixed. */
function recomputeSmells(
  level: Level,
  code: string,
  prevStatus: Record<string, SmellStatus>,
  prevProgress: Record<string, number>,
): { status: Record<string, SmellStatus>; progress: Record<string, number> } {
  const status = { ...prevStatus }
  const progress = { ...prevProgress }
  for (const smell of level.smells) {
    const validator = level.smellValidators[smell.id]
    if (validator) {
      const score = validator(code)
      progress[smell.id] = score
      if (score >= 1) status[smell.id] = 'fixed'
      else if (score > 0) status[smell.id] = 'partial'
      else status[smell.id] = 'pending'
    }
  }
  return { status, progress }
}

/** Calcula la energía restante: budget - suma de energyCost de smells fixed. */
function calcEnergy(level: Level, smellStatus: Record<string, SmellStatus>): number {
  let energy = level.energyBudget
  for (const smell of level.smells) {
    if (smellStatus[smell.id] === 'fixed') {
      energy -= smell.energyCost
    }
  }
  return Math.max(energy, 0)
}

/** Avanza el paso del avatar según el modo y los smells fixed. */
function advanceAvatar(
  level: Level,
  smellStatus: Record<string, SmellStatus>,
  prevStep: number,
): {
  avatarStep: number
  avatarMessage?: string
  avatarHighlightLine?: number
  avatarHighlightZone?: string
  avatarCinematicBlur?: boolean
  avatarZone: AvatarZone
  interactiveLock: boolean
} {
  const tutorial = level.tutorial
  if (!tutorial || tutorial.avatarMode === 'off' || !tutorial.steps) {
    return {
      avatarStep: prevStep,
      avatarZone: 'bottom-right',
      interactiveLock: false,
    }
  }

  // 'walkthrough' y 'reveal-solution': avanzar cuando el smell esperado pasa
  if (tutorial.avatarMode === 'walkthrough' || tutorial.avatarMode === 'reveal-solution') {
    let step = prevStep
    // Avanzar todos los pasos consecutivos cuyo trigger se haya cumplido
    while (step < tutorial.steps.length) {
      const cur = tutorial.steps[step]
      if (cur.trigger === 'smell-fixed' && cur.waitForSmell) {
        if (smellStatus[cur.waitForSmell] === 'fixed') {
          step++
          continue
        }
        break
      }
      // 'level-start' ya se consumió al inicializar
      if (cur.trigger === 'level-start') {
        step++
        continue
      }
      break
    }
    const msg = tutorial.steps[step]
    return {
      avatarStep: step,
      avatarMessage: msg?.message,
      avatarHighlightLine: msg?.highlightLine,
      avatarHighlightZone: msg?.highlightZone,
      avatarCinematicBlur: msg?.cinematicBlur,
      avatarZone: msg?.zone ?? 'bottom-right',
      interactiveLock: msg?.interactiveLock ?? false,
    }
  }

  return {
    avatarStep: prevStep,
    avatarZone: 'bottom-right',
    interactiveLock: false,
  }
}

export function useGameState(level: Level) {
  const [state, setState] = useState<GameState>(() => initialState(level))
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([])
  const [changed, setChanged] = useState(false)
  const [levelCompleted, setLevelCompleted] = useState(false)
  const [prevLevelId, setPrevLevelId] = useState<number>(level.id)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ref con el levelId actual, actualizado en effect. Lo leen los timers
  // pendientes para auto-invalidarse si el nivel cambió mientras esperaban.
  const currentLevelIdRef = useRef<number>(level.id)

  // Reset al cambiar de nivel — patrón "adjust state during render" (React 19)
  // en vez de useEffect+setState, que el linter prohíbe.
  if (prevLevelId !== level.id) {
    setPrevLevelId(level.id)
    setState(initialState(level))
    setTelemetry([])
    setChanged(false)
    setLevelCompleted(false)
  }

  // Sincronizar currentLevelIdRef y cancelar timers pendientes al cambiar de nivel.
  // Se hace en effect (no durante render) porque el linter prohíbe tocar refs en render.
  useEffect(() => {
    currentLevelIdRef.current = level.id
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current)
      completionTimerRef.current = null
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [level.id])

  const emit = useCallback((event: TelemetryEvent) => {
    setTelemetry((prev) => [...prev, event])
  }, [])

  const updateCode = useCallback((code: string) => {
    setState((prev) => {
      if (prev.levelId !== level.id) return prev
      const codeChanged = code !== level.initialCode
      const { status: smellStatus, progress: smellProgress } =
        recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
      const energy = calcEnergy(level, smellStatus)
      const stability = calcStability(smellProgress, prev.testResults, level.smells.length)
      const avatar = advanceAvatar(level, smellStatus, prev.avatarStep)
      return {
        ...prev,
        code,
        smellStatus,
        smellProgress,
        energy: Math.max(energy, 0),
        stability,
        phase: codeChanged ? 'refactor' as const : 'diagnosis' as const,
        avatarStep: avatar.avatarStep,
        avatarMessage: avatar.avatarMessage,
        avatarHighlightLine: avatar.avatarHighlightLine,
        avatarHighlightZone: avatar.avatarHighlightZone,
        avatarCinematicBlur: avatar.avatarCinematicBlur,
        avatarZone: avatar.avatarZone,
        interactiveLock: avatar.interactiveLock,
      }
    })
    setChanged(code !== level.initialCode)
    setLevelCompleted(false)
  }, [level])

  // ── Capa 2: recibir status de sintaxis del hook useTestRunner ──
  const setCompileStatus = useCallback((
    status: CompileStatus,
    error?: string,
    markers?: SyntaxMarker[],
  ) => {
    setState((prev) => {
      if (prev.levelId !== level.id) return prev
      return {
        ...prev,
        compileStatus: status,
        syntaxError: status === 'syntax-error' ? error : undefined,
      }
    })
    if (status === 'syntax-error') {
      emit({ type: 'syntax_error', timestamp: Date.now() })
    }
    void markers
  }, [emit, level.id])

  const applyTestResults = useCallback((results: TestResult[]) => {
    setState((prev) => {
      // Guard: ignorar results de otro nivel (llegaron tras un cambio de nivel)
      if (prev.levelId !== level.id) return prev
      const attempts = prev.attempts + 1
      const codeChanged = prev.code !== level.initialCode
      const allTestsPassed = results.length > 0 && results.every((r) => r.passed)
      const stability = calcStability(prev.smellProgress, results, level.smells.length)
      // Completado: TODOS los smells fixed + TODOS los tests pasan + código modificado
      const allSmellsFixed = level.smells.length === 0
        || Object.values(prev.smellStatus).every(s => s === 'fixed')
      const isComplete = allTestsPassed && codeChanged && allSmellsFixed && stability >= 75
      if (isComplete) {
        // Capturar el levelId actual en el closure; el callback verifica
        // currentLevelIdRef al dispararse para auto-invalidarse si el nivel cambió.
        const completedLevelId = level.id
        if (completionTimerRef.current) clearTimeout(completionTimerRef.current)
        completionTimerRef.current = setTimeout(() => {
          completionTimerRef.current = null
          if (currentLevelIdRef.current === completedLevelId) {
            setLevelCompleted(true)
          }
          // Si el nivel cambió, el timer se descarta silenciosamente.
        }, 100)
        emit({
          type: 'level_passed',
          timestamp: Date.now(),
          firstTry: prev.attempts === 0,
        })
      } else {
        emit({
          type: 'test_run',
          timestamp: Date.now(),
        })
      }
      return {
        ...prev,
        testResults: results,
        attempts,
        stability,
        phase: isComplete ? 'feedback' as const : prev.phase,
        // Avatar: si se completó, anunciar estabilidad 100%
        avatarActive: isComplete ? true : prev.avatarActive,
        avatarMessage: isComplete ? '¡Estabilidad 100%! Sistema completamente estabilizado.' : prev.avatarMessage,
      }
    })
  }, [level, emit])

  const loadSolution = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current)
      completionTimerRef.current = null
    }
    setState((prev) => {
      if (prev.levelId !== level.id) return prev
      const code = level.solution
      const { status: smellStatus, progress: smellProgress } =
        recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
      const energy = calcEnergy(level, smellStatus)
      const stability = calcStability(smellProgress, prev.testResults, level.smells.length)
      return { ...prev, code, smellStatus, smellProgress, energy, stability, phase: 'refactor' }
    })
    setChanged(true)
    setLevelCompleted(false)
  }, [level])

  const resetLevel = useCallback(() => {
    if (completionTimerRef.current) {
      clearTimeout(completionTimerRef.current)
      completionTimerRef.current = null
    }
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    setState(initialState(level))
    setTelemetry([])
    setChanged(false)
    setLevelCompleted(false)
  }, [level])

  // ── Avatar: inyectar solución de un smell guiado (nivel 6) ──
  const injectGuidedSmell = useCallback(() => {
    const tutorial = level.tutorial
    if (!tutorial || tutorial.avatarMode !== 'guided-smell' || !tutorial.guidedInjection) return
    setState((prev) => {
      if (prev.levelId !== level.id) return prev
      const code = tutorial.guidedInjection as string
      const { status: smellStatus, progress: smellProgress } =
        recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
      const energy = calcEnergy(level, smellStatus)
      const stability = calcStability(smellProgress, prev.testResults, level.smells.length)
      emit({
        type: 'avatar_intervention',
        timestamp: Date.now(),
        avatarMode: 'guided-smell',
        smellId: tutorial.guidedSmellId,
        trigger: 'guided-injection',
      })
      return {
        ...prev,
        code,
        smellStatus,
        smellProgress,
        energy,
        stability,
        phase: 'refactor',
        avatarActive: false,
        avatarMessage: '¡Yo me encargo de este! Tú haz los otros dos.',
      }
    })
    setChanged(true)
  }, [level, emit])

  // ── Avatar: inyectar código de un paso reveal-solution (nivel 0) ──
  const injectAvatarStep = useCallback(() => {
    const tutorial = level.tutorial
    if (!tutorial || !tutorial.steps) return
    setState((prev) => {
      const step = tutorial.steps![prev.avatarStep]
      if (!step || !step.injectCode) return prev
      const code = step.injectCode
      const { status: smellStatus, progress: smellProgress } =
        recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
      const energy = calcEnergy(level, smellStatus)
      const stability = calcStability(smellProgress, prev.testResults, level.smells.length)
      emit({
        type: 'avatar_intervention',
        timestamp: Date.now(),
        avatarMode: tutorial.avatarMode,
        trigger: 'reveal-step',
      })
      return {
        ...prev,
        code,
        smellStatus,
        smellProgress,
        energy,
        stability,
        phase: 'refactor',
      }
    })
    setChanged(true)
  }, [level, emit])

  // ── Avatar: avanzar paso manualmente (walkthrough / reveal-solution) ──
  // En modo reveal-solution, si el paso actual tiene injectCode, lo inyecta
  // en el editor antes de avanzar al siguiente paso.
  const confirmAvatarStep = useCallback(() => {
    const tutorial = level.tutorial
    if (!tutorial || !tutorial.steps) return
    setState((prev) => {
      if (prev.levelId !== level.id) return prev
      const cur = tutorial.steps![prev.avatarStep]

      // Si el paso actual tiene injectCode, inyectarlo en el editor
      if (cur?.injectCode) {
        const code = cur.injectCode
        const { status: smellStatus, progress: smellProgress } =
          recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
        const energy = calcEnergy(level, smellStatus)
        const stability = calcStability(smellProgress, prev.testResults, level.smells.length)
        const next = prev.avatarStep + 1
        if (next >= tutorial.steps!.length) {
          return {
            ...prev, code, smellStatus, smellProgress, energy, stability,
            avatarMessage: undefined, avatarHighlightLine: undefined, avatarHighlightZone: undefined, avatarCinematicBlur: undefined,
            avatarZone: 'bottom-right' as const, interactiveLock: false,
          }
        }
        const step = tutorial.steps![next]
        return {
          ...prev, code, smellStatus, smellProgress, energy, stability,
          avatarStep: next,
          avatarMessage: step.message,
          avatarHighlightLine: step.highlightLine,
          avatarHighlightZone: step.highlightZone,
          avatarCinematicBlur: step.cinematicBlur,
          avatarZone: step.zone ?? 'bottom-right',
          interactiveLock: step.interactiveLock ?? false,
        }
      }

      // Paso sin injectCode: sólo avanzar
      const next = prev.avatarStep + 1
      if (next >= tutorial.steps!.length) {
        return {
          ...prev,
          avatarMessage: undefined,
          avatarHighlightLine: undefined,
          avatarHighlightZone: undefined,
          avatarCinematicBlur: undefined,
          avatarZone: 'bottom-right' as const,
          interactiveLock: false,
        }
      }
      const step = tutorial.steps![next]
      return {
        ...prev,
        avatarStep: next,
        avatarMessage: step.message,
        avatarHighlightLine: step.highlightLine,
        avatarHighlightZone: step.highlightZone,
        avatarCinematicBlur: step.cinematicBlur,
        avatarZone: step.zone ?? 'bottom-right',
        interactiveLock: step.interactiveLock ?? false,
      }
    })
  }, [level])

  // ── Avatar: mostrar hint tras idle (hint-on-stuck) ──
  const showHint = useCallback((message: string, highlightLine?: number) => {
    setState((prev) => ({
      ...prev,
      avatarActive: true,
      avatarMessage: message,
      avatarHighlightLine: highlightLine,
      avatarHighlightZone: undefined,
      avatarCinematicBlur: undefined,
    }))
    emit({
      type: 'avatar_intervention',
      timestamp: Date.now(),
      avatarMode: 'hint-on-stuck',
      trigger: 'idle-or-fails',
    })
  }, [emit])

  // Timer de idle para hint-on-stuck
  useEffect(() => {
    const tutorial = level.tutorial
    if (!tutorial || tutorial.avatarMode !== 'hint-on-stuck' || !tutorial.hintAfterIdleMs) return
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      setState((prev) => {
        // Sólo si el jugador no ha avanzado
        const anyFixed = Object.values(prev.smellStatus).some(s => s === 'fixed')
        if (anyFixed) return prev
        return {
          ...prev,
          avatarActive: true,
          avatarMessage: tutorial.steps?.[0]?.message ?? '¿Te atascaste? Prueba extrayendo una función.',
          avatarHighlightLine: tutorial.steps?.[0]?.highlightLine,
          avatarHighlightZone: undefined,
          avatarCinematicBlur: undefined,
        }
      })
      emit({
        type: 'avatar_intervention',
        timestamp: Date.now(),
        avatarMode: 'hint-on-stuck',
        trigger: 'idle-ms',
      })
    }, tutorial.hintAfterIdleMs)
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [level, state.code, emit])

  return {
    state,
    telemetry,
    changed,
    levelCompleted,
    updateCode,
    applyTestResults,
    loadSolution,
    resetLevel,
    setCompileStatus,
    injectGuidedSmell,
    injectAvatarStep,
    confirmAvatarStep,
    showHint,
  }
}
