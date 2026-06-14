/* ============================================================
   RefactorQuest — Web Worker: ejecuta tests en sandbox
   El código del jugador se evalúa aquí, aislado del hilo UI.
   ============================================================ */

type RunMessage = {
  type: 'RUN_TESTS'
  code: string
  tests: Array<{ id: string; description: string; fn: string }>
}

self.onmessage = (event: MessageEvent<RunMessage>) => {
  if (event.data.type !== 'RUN_TESTS') return

  const { code, tests } = event.data
  const results: Array<{ testId: string; passed: boolean; error?: string }> = []

  for (const test of tests) {
    try {
      // eslint-disable-next-line no-new-func
      const fullScript = `
        ${code}
        ;(function() {
          ${test.fn}
        })();
      `
      // new Function ejecuta en el scope global del worker (sin DOM)
      new Function(fullScript)()
      results.push({ testId: test.id, passed: true })
    } catch (err) {
      results.push({
        testId: test.id,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  self.postMessage({ type: 'TEST_RESULTS', results })
}