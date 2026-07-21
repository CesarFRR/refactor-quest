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
  SmellRange,
  CodeSmell,
} from '../types'

function initialState(level: Level): GameState {
  const smellStatus: Record<string, SmellStatus> = {}
  const smellProgress: Record<string, number> = {}
  const smellRanges: Record<string, SmellRange[]> = {}
  level.smells.forEach((s) => {
    smellStatus[s.id] = 'pending'
    smellProgress[s.id] = 0
    smellRanges[s.id] = [{ start: s.lineStart, end: s.lineEnd }]
  })
  const tutorial = level.tutorial
  const firstStep = tutorial?.steps?.[0]
  const avatarActiveAtStart =
    tutorial != null && tutorial.avatarMode !== 'off'
    const { stability, smellScore } = calcStability(smellProgress, [], level.smells)
    return {
      levelId: level.id,
      code: level.initialCode,
      smellStatus,
      smellProgress,
      energy: level.energyBudget,
      attempts: 0,
      stability,
      smellScore,
      testResults: [],
    phase: 'diagnosis',
    compileStatus: 'idle',
    avatarStep: 0,
    avatarActive: avatarActiveAtStart,
    avatarMessage: firstStep?.trigger === 'level-start' ? firstStep.message : undefined,
    avatarHighlightLine: firstStep?.highlightLine,
    avatarHighlightRange: firstStep?.highlightRange,
    avatarHighlightZone: firstStep?.highlightZone,
    avatarCinematicBlur: firstStep?.cinematicBlur,
    avatarInjecting: false,
    injectTarget: undefined,
    avatarZone: firstStep?.zone ?? 'bottom-right',
    interactiveLock: firstStep?.interactiveLock ?? false,
    avatarMood: firstStep?.mood,
    smellRanges,
  }
}

/**
 * Calcula el weighted average de progreso de smells usando energyCost como peso.
 */
function calcSmellScore(smellProgress: Record<string, number>, smells: CodeSmell[]): number {
  let totalWeight = 0
  let weightedSum = 0
  for (const s of smells) {
    const w = s.energyCost
    totalWeight += w
    weightedSum += (smellProgress[s.id] ?? 0) * w
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 1
}

/**
 * Estabilidad del sistema — 70% weighted smells + 30% tests:
 *   smells  = 70% del total (weighted avg por energyCost)
 *   tests   = 30% del total (si no se han ejecutado, 0)
 *   total   = smells + tests, cap 100
 *
 * Retorna { stability (0-100), smellScore (0-1) }.
 */
function calcStability(
  smellProgress: Record<string, number>,
  testResults: TestResult[],
  smells: CodeSmell[],
): { stability: number; smellScore: number } {
  const smellScore = calcSmellScore(smellProgress, smells)
  const passed = testResults.filter((r) => r.passed).length
  const testScore = testResults.length > 0 ? (passed / testResults.length) * 30 : 0
  return {
    stability: Math.min(Math.round(smellScore * 70 + testScore), 100),
    smellScore,
  }
}

/** Recalcula el smellStatus, smellProgress y smellRanges a partir de los validators.
 *  Los validators devuelven 0-1, o { score, ranges } con rangos dinámicos. */
function recomputeSmells(
  level: Level,
  code: string,
  prevStatus: Record<string, SmellStatus>,
  prevProgress: Record<string, number>,
): { status: Record<string, SmellStatus>; progress: Record<string, number>; ranges: Record<string, SmellRange[]> } {
  const status = { ...prevStatus }
  const progress = { ...prevProgress }
  const ranges: Record<string, SmellRange[]> = {}
  for (const smell of level.smells) {
    const validator = level.smellValidators[smell.id]
    if (validator) {
      const result = validator(code)
      if (typeof result === 'object' && result !== null) {
        progress[smell.id] = result.score
        ranges[smell.id] = result.ranges ?? []
      } else {
        progress[smell.id] = result
        ranges[smell.id] = [{ start: smell.lineStart, end: smell.lineEnd }]
      }
      if (progress[smell.id] >= 1) status[smell.id] = 'fixed'
      else if (progress[smell.id] > 0) status[smell.id] = 'partial'
      else status[smell.id] = 'pending'
    }
  }
  return { status, progress, ranges }
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
  avatarInjecting: boolean
  avatarZone: AvatarZone
  interactiveLock: boolean
  avatarMood?: string
  avatarHighlightRange?: SmellRange
} {
  const tutorial = level.tutorial
  if (!tutorial || tutorial.avatarMode === 'off' || !tutorial.steps) {
    return {
      avatarStep: prevStep,
      avatarInjecting: false,
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
      avatarHighlightRange: msg?.highlightRange,
      avatarHighlightZone: msg?.highlightZone,
      avatarCinematicBlur: msg?.cinematicBlur,
      avatarInjecting: false,
      avatarZone: msg?.zone ?? 'bottom-right',
      interactiveLock: msg?.interactiveLock ?? false,
      avatarMood: msg?.mood,
    }
  }

  return {
    avatarStep: prevStep,
    avatarInjecting: false,
    avatarZone: 'bottom-right',
    interactiveLock: false,
    avatarMood: undefined,
    avatarHighlightRange: undefined,
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
      const { status: smellStatus, progress: smellProgress, ranges: smellRanges } =
        recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
      const energy = calcEnergy(level, smellStatus)
      const { stability, smellScore } = calcStability(smellProgress, prev.testResults, level.smells)
      const avatar = advanceAvatar(level, smellStatus, prev.avatarStep)
      const stepAdvanced = avatar.avatarStep !== prev.avatarStep
      return {
        ...prev,
        code,
        smellStatus,
        smellProgress,
        smellRanges,
        energy: Math.max(energy, 0),
        stability,
        smellScore,
        phase: codeChanged ? 'refactor' as const : 'diagnosis' as const,
        avatarStep: avatar.avatarStep,
        // Solo sobreescribir display del avatar cuando el paso avanza
        ...(stepAdvanced ? {
          avatarMessage: avatar.avatarMessage,
          avatarHighlightLine: avatar.avatarHighlightLine,
          avatarHighlightRange: avatar.avatarHighlightRange,
          avatarHighlightZone: avatar.avatarHighlightZone,
          avatarCinematicBlur: avatar.avatarCinematicBlur,
          avatarInjecting: false,
          injectTarget: undefined,
          avatarZone: avatar.avatarZone,
          interactiveLock: avatar.interactiveLock,
          avatarMood: avatar.avatarMood,
        } : {}),
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
      const { stability, smellScore } = calcStability(prev.smellProgress, results, level.smells)
      // Completado: TODOS los smells fixed + TODOS los tests pasan + código modificado
      const allSmellsFixed = level.smells.length === 0
        || Object.values(prev.smellStatus).every(s => s === 'fixed')
      // Nivel 0 (demo, sin smells): completo si tests pasan, sin requerir codeChanged
      const isDemoLevel = level.smells.length === 0 && level.tutorial?.avatarMode === 'reveal-solution'
      const isComplete = allTestsPassed && allSmellsFixed && stability >= 75
        && (isDemoLevel || codeChanged)
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
        smellScore,
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
      const { status: smellStatus, progress: smellProgress, ranges: smellRanges } =
        recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
      const energy = calcEnergy(level, smellStatus)
      const { stability, smellScore } = calcStability(smellProgress, prev.testResults, level.smells)
      return { ...prev, code, smellStatus, smellProgress, smellRanges, energy, stability, smellScore, phase: 'refactor', avatarInjecting: false, injectTarget: undefined }
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
      const { status: smellStatus, progress: smellProgress, ranges: smellRanges } =
        recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
      const energy = calcEnergy(level, smellStatus)
      const { stability, smellScore } = calcStability(smellProgress, prev.testResults, level.smells)
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
        smellRanges,
        energy,
        stability,
        smellScore,
        phase: 'refactor',
        avatarInjecting: false,
        injectTarget: undefined,
        avatarActive: false,
        avatarMessage: 'Listo, ya dividí processOrder. El Long Method está domado. Los otros dos smells son tuyos — Magic Numbers y Duplicate Code. ¡Tú puedes! (O si no, aquí estoy).',
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
      const { status: smellStatus, progress: smellProgress, ranges: smellRanges } =
        recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
      const energy = calcEnergy(level, smellStatus)
      const { stability, smellScore } = calcStability(smellProgress, prev.testResults, level.smells)
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
        smellRanges,
        energy,
        stability,
        smellScore,
        phase: 'refactor',
        avatarInjecting: false,
        injectTarget: undefined,
      }
    })
    setChanged(true)
  }, [level, emit])

  // ── Avatar: avanzar paso manualmente (walkthrough / reveal-solution) ──
  const confirmAvatarStep = useCallback(() => {
    const tutorial = level.tutorial
    if (!tutorial || !tutorial.steps) return
    setState((prev) => {
      if (prev.levelId !== level.id) return prev

      // hint-on-stuck: solo descartar el mensaje, mantener avatar activo
      if (tutorial.avatarMode === 'hint-on-stuck') {
        return {
          ...prev,
          avatarMessage: undefined,
          avatarHighlightLine: undefined,
          avatarHighlightZone: undefined,
          avatarCinematicBlur: undefined,
          avatarMood: undefined,
          avatarStep: Math.max(prev.avatarStep, 1),
        }
      }

      const cur = tutorial.steps![prev.avatarStep]

      // Paso con injectCode: activar animación de tipeo en el editor
      if (cur?.injectCode) {
        return {
          ...prev,
          avatarInjecting: true,
          injectTarget: cur.injectCode,
          interactiveLock: true,
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
          avatarMood: undefined,
          avatarHighlightRange: undefined,
        }
      }
      const step = tutorial.steps![next]
      return {
        ...prev,
        avatarStep: next,
        avatarMessage: step.message,
        avatarHighlightLine: step.highlightLine,
        avatarHighlightRange: step.highlightRange,
        avatarHighlightZone: step.highlightZone,
        avatarCinematicBlur: step.cinematicBlur,
        avatarZone: step.zone ?? 'bottom-right',
        interactiveLock: step.interactiveLock ?? false,
        avatarMood: step.mood,
      }
    })
  }, [level])

  /** Completa la animación de inyección: actualiza código, smells y avanza paso */
  const completeInjection = useCallback(() => {
    const tutorial = level.tutorial
    if (!tutorial || !tutorial.steps) return
    setState((prev) => {
      if (prev.levelId !== level.id || !prev.injectTarget) return prev
      const code = prev.injectTarget
      const { status: smellStatus, progress: smellProgress, ranges: smellRanges } =
        recomputeSmells(level, code, prev.smellStatus, prev.smellProgress)
      const energy = calcEnergy(level, smellStatus)
      const { stability, smellScore } = calcStability(smellProgress, prev.testResults, level.smells)
      const next = prev.avatarStep + 1
      if (next >= tutorial.steps!.length) {
        return {
          ...prev, code, smellStatus, smellProgress, smellRanges, energy, stability, smellScore,
          avatarInjecting: false, injectTarget: undefined,
          avatarMessage: undefined, avatarHighlightLine: undefined,
          avatarHighlightZone: undefined, avatarCinematicBlur: undefined,
          avatarZone: 'bottom-right' as const, interactiveLock: false,
          avatarMood: undefined,
          avatarHighlightRange: undefined,
        }
      }
      const step = tutorial.steps![next]
      return {
        ...prev, code, smellStatus, smellProgress, smellRanges, energy, stability, smellScore,
        avatarInjecting: false, injectTarget: undefined,
        avatarStep: next,
        avatarMessage: step.message,
        avatarHighlightLine: step.highlightLine,
        avatarHighlightRange: step.highlightRange,
        avatarHighlightZone: step.highlightZone,
        avatarCinematicBlur: step.cinematicBlur,
        avatarZone: step.zone ?? 'bottom-right',
        interactiveLock: step.interactiveLock ?? false,
        avatarMood: step.mood,
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
    completeInjection,
    showHint,
  }
}
