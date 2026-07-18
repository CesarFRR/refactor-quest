/* ============================================================
   RefactorQuest — Hook: useTestRunner
   Ejecuta los tests del nivel en el Web Worker sandbox.
   También expone compileCode() para feedback inmediato de sintaxis
   (Capa 2) sin ejecutar los tests.
   ============================================================ */
import { useState, useCallback, useRef, useEffect } from 'react'
import type { TestCase, TestResult, CompileStatus } from '../types'

type CompileResult = {
  type: 'COMPILE_RESULT'
  ok: boolean
  error?: string
  errorLine?: number
  seq?: number
}

type TestResultsMsg = {
  type: 'TEST_RESULTS'
  results: TestResult[]
}

type WorkerOutgoing = CompileResult | TestResultsMsg

export function useTestRunner() {
  const [results, setResults] = useState<TestResult[]>([])
  const [running, setRunning] = useState(false)
  const [compileStatus, setCompileStatus] = useState<CompileStatus>('idle')
  const [syntaxError, setSyntaxError] = useState<string | undefined>(undefined)
  const [syntaxErrorLine, setSyntaxErrorLine] = useState<number | undefined>(undefined)
  const workerRef = useRef<Worker | null>(null)
  const compileTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const compileSeqRef = useRef(0)

  // Asegurar un worker disponible (compartido entre compile y tests)
  const getWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current
    const worker = new Worker(
      new URL('../workers/testRunner.worker.ts', import.meta.url),
      { type: 'module' },
    )
    worker.onmessage = (e: MessageEvent<WorkerOutgoing>) => {
      const msg = e.data
      if (msg.type === 'COMPILE_RESULT') {
        // Ignorar respuestas desactualizadas
        if (msg.seq !== undefined && msg.seq !== compileSeqRef.current) return
        if (msg.ok) {
          setCompileStatus('ok')
          setSyntaxError(undefined)
          setSyntaxErrorLine(undefined)
        } else {
          setCompileStatus('syntax-error')
          setSyntaxError(msg.error)
          setSyntaxErrorLine(msg.errorLine)
        }
      } else if (msg.type === 'TEST_RESULTS') {
        setResults(msg.results)
        setRunning(false)
        worker.terminate()
        workerRef.current = null
      }
    }
    worker.onerror = (err) => {
      if (workerRef.current !== worker) return // worker viejo, ignorar
      console.error('Worker error:', err)
      setRunning(false)
      setCompileStatus('syntax-error')
      setSyntaxError('Error fatal del worker')
      worker.terminate()
      workerRef.current = null
    }
    workerRef.current = worker
    return worker
  }, [])

  // ── Capa 2: validación de sintaxis con debounce (~400ms) ──
  const compileCode = useCallback((code: string) => {
    if (compileTimerRef.current) clearTimeout(compileTimerRef.current)
    compileTimerRef.current = setTimeout(() => {
      const seq = ++compileSeqRef.current
      const worker = getWorker()
      // Adjuntar seq al mensaje para descartar respuestas viejas
      worker.postMessage({ type: 'COMPILE_CHECK', code, seq })
    }, 400)
  }, [getWorker])

  // Cancelar debounced compile pendiente (ej. al cambiar de nivel)
  const clearCompile = useCallback(() => {
    if (compileTimerRef.current) {
      clearTimeout(compileTimerRef.current)
      compileTimerRef.current = null
    }
    setCompileStatus('idle')
    setSyntaxError(undefined)
    setSyntaxErrorLine(undefined)
  }, [])

  const runTests = useCallback((code: string, tests: TestCase[]) => {
    // Terminar worker anterior si existe (puede tener listeners de compile)
    workerRef.current?.terminate()
    workerRef.current = null

    setRunning(true)
    setResults([])

    const worker = new Worker(
      new URL('../workers/testRunner.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (e: MessageEvent<WorkerOutgoing>) => {
      if (e.data.type === 'TEST_RESULTS') {
        setResults(e.data.results)
        setRunning(false)
        setCompileStatus('ok')
        worker.terminate()
        workerRef.current = null
      }
    }

    worker.onerror = (err) => {
      if (workerRef.current !== worker) return
      console.error('Worker error:', err)
      setRunning(false)
      worker.terminate()
      workerRef.current = null
    }

    worker.postMessage({ type: 'RUN_TESTS', code, tests })
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
  }, [])

  // ── Reset total: limpia results + compileStatus + cancela timers/workers ──
  // Pensado para llamarse al cambiar de nivel (adjust-during-render en App).
  const resetAll = useCallback(() => {
    if (compileTimerRef.current) {
      clearTimeout(compileTimerRef.current)
      compileTimerRef.current = null
    }
    workerRef.current?.terminate()
    workerRef.current = null
    compileSeqRef.current++
    setResults([])
    setRunning(false)
    setCompileStatus('idle')
    setSyntaxError(undefined)
    setSyntaxErrorLine(undefined)
  }, [])

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (compileTimerRef.current) clearTimeout(compileTimerRef.current)
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  return {
    results,
    running,
    compileStatus,
    syntaxError,
    syntaxErrorLine,
    runTests,
    compileCode,
    clearResults,
    clearCompile,
    resetAll,
  }
}