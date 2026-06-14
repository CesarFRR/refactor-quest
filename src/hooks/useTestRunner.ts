/* ============================================================
   RefactorQuest — Hook: useTestRunner
   Ejecuta los tests del nivel en el Web Worker sandbox.
   ============================================================ */
import { useState, useCallback, useRef } from 'react'
import type { TestCase, TestResult } from '../types'

export function useTestRunner() {
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const workerRef = useRef<Worker | null>(null)

  const runTests = useCallback((code: string, tests: TestCase[]) => {
    // Terminar worker anterior si existe
    workerRef.current?.terminate()

    setRunning(true)
    setResults([])

    const worker = new Worker(
      new URL('../workers/testRunner.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (e) => {
      if (e.data.type === 'TEST_RESULTS') {
        setResults(e.data.results)
        setRunning(false)
        worker.terminate()
      }
    }

    worker.onerror = (err) => {
      console.error('Worker error:', err)
      setRunning(false)
      worker.terminate()
    }

    worker.postMessage({ type: 'RUN_TESTS', code, tests })
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
  }, [])

  return { results, running, runTests, clearResults }
}