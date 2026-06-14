import { useState, useCallback } from 'react'
import type { GameState, TestResult, TelemetryEvent, SmellStatus, Level } from '../types'

function initialState(level: Level): GameState {
  const smellStatus: Record<string, SmellStatus> = {}
  level.smells.forEach((s) => { smellStatus[s.id] = 'pending' })
  return {
    levelId: level.id,
    code: level.initialCode,
    smellStatus,
    energy: level.energyBudget,
    attempts: 0,
    stability: 20,
    testResults: [],
    phase: 'diagnosis',
  }
}

function calcStability(
  smellStatus: Record<string, SmellStatus>,
  testResults: TestResult[],
  totalSmells: number,
  codeChanged: boolean,
): number {
  const fixed = Object.values(smellStatus).filter((s) => s === 'fixed').length
  const passed = testResults.filter((r) => r.passed).length
  const smellScore = (fixed / Math.max(totalSmells, 1)) * 40
  const testScore = testResults.length ? (passed / testResults.length) * 40 : 0
  const changeScore = codeChanged ? 20 : 0
  return Math.min(Math.round(20 + smellScore + testScore + changeScore), 100)
}

export function useGameState(level: Level) {
  const [state, setState] = useState<GameState>(() => initialState(level))
  const [telemetry, setTelemetry] = useState<TelemetryEvent[]>([])
  const [changed, setChanged] = useState(false)
  const [levelCompleted, setLevelCompleted] = useState(false)

  const emit = useCallback((event: TelemetryEvent) => {
    setTelemetry((prev) => [...prev, event])
  }, [])

  const updateCode = useCallback((code: string) => {
    setState((prev) => {
      const codeChanged = code !== level.initialCode
      const smellStatus = { ...prev.smellStatus }
      for (const smell of level.smells) {
        const validator = level.smellValidators[smell.id]
        if (validator && validator(code)) {
          smellStatus[smell.id] = 'fixed'
        }
      }
      const fixedCount = Object.values(smellStatus).filter(s => s === 'fixed').length
      const energy = level.energyBudget - fixedCount * 2
      const stability = calcStability(smellStatus, prev.testResults, level.smells.length, codeChanged)
      return {
        ...prev,
        code,
        smellStatus,
        energy: Math.max(energy, 0),
        stability,
        phase: codeChanged ? 'refactor' as const : 'diagnosis' as const,
      }
    })
    setChanged(code !== level.initialCode)
    setLevelCompleted(false)
  }, [level.initialCode, level.smells, level.smellValidators, level.energyBudget])

  const applyTestResults = useCallback((results: TestResult[]) => {
    setState((prev) => {
      const attempts = prev.attempts + 1
      const codeChanged = prev.code !== level.initialCode
      const allTestsPassed = results.length > 0 && results.every((r) => r.passed)
      const stability = calcStability(prev.smellStatus, results, level.smells.length, codeChanged || changed)
      const isComplete = allTestsPassed && codeChanged && stability >= 75
      if (isComplete) {
        setTimeout(() => setLevelCompleted(true), 100)
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
      }
    })
  }, [level, changed, emit])

  const loadSolution = useCallback(() => {
    setState((prev) => {
      const code = level.solution
      const smellStatus: Record<string, SmellStatus> = {}
      for (const smell of level.smells) {
        const validator = level.smellValidators[smell.id]
        smellStatus[smell.id] = (validator && validator(code)) ? 'fixed' : 'pending'
      }
      const energy = 10
      const stability = calcStability(smellStatus, prev.testResults, level.smells.length, true)
      return { ...prev, code, smellStatus, energy, stability, phase: 'refactor' }
    })
    setChanged(true)
    setLevelCompleted(false)
  }, [level])

  const resetLevel = useCallback(() => {
    setState(initialState(level))
    setTelemetry([])
    setChanged(false)
    setLevelCompleted(false)
  }, [level])

  return {
    state,
    telemetry,
    changed,
    levelCompleted,
    updateCode,
    applyTestResults,
    loadSolution,
    resetLevel,
  }
}
