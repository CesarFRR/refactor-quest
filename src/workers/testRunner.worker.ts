/* ============================================================
   RefactorQuest — Web Worker: ejecuta tests en sandbox
   El código del jugador se evalúa aquí, aislado del hilo UI.

   Dos tipos de mensaje:
     - COMPILE_CHECK : sólo valida que el código parsea (new Function).
                      No ejecuta nada. Barato, para feedback inmediato.
     - RUN_TESTS     : ejecuta el código + cada test y reporta resultados.
   ============================================================ */

type RunMessage = {
  type: 'RUN_TESTS'
  code: string
  tests: Array<{ id: string; description: string; fn: string }>
}

type CompileMessage = {
  type: 'COMPILE_CHECK'
  code: string
  seq?: number
}

type IncomingMessage = RunMessage | CompileMessage

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const data = event.data

  // ── Capa 2: sólo saber si el código parsea, sin ejecutarlo ──
  if (data.type === 'COMPILE_CHECK') {
    const seq = (data as CompileMessage).seq
    try {
      new Function(data.code)
      self.postMessage({ type: 'COMPILE_RESULT', ok: true, seq })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const lineMatch = msg.match(/line (\d+)|<anonymous>:(\d+)/i)
      const line = lineMatch ? parseInt(lineMatch[1] ?? lineMatch[2], 10) : undefined
      self.postMessage({
        type: 'COMPILE_RESULT',
        ok: false,
        error: msg,
        errorLine: line,
        seq,
      })
    }
    return
  }

  // ── Capa 3: ejecutar tests ──
  if (data.type !== 'RUN_TESTS') return

  const { code, tests } = data
  const results: Array<{ testId: string; passed: boolean; error?: string }> = []

  for (const test of tests) {
    try {
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