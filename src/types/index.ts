/* ============================================================
   RefactorQuest — Tipos compartidos
   ============================================================ */

/** Severidades posibles de un code smell */
export type Severity = 'critical' | 'warning' | 'info'

/** Estado de un smell dentro del nivel */
export type SmellStatus = 'pending' | 'fixed' | 'skipped'

/** Descripción de un code smell detectado */
export interface CodeSmell {
  id: string
  name: string          // "Long Method", "Magic Numbers", "Duplicate Code"
  severity: Severity
  description: string
  lineStart: number
  lineEnd: number
  energyCost: number    // Cuánta energía consume refactorizar este smell
}

/** Definición de un nivel del juego */
export interface Level {
  id: number
  title: string
  narrative: string     // Contexto narrativo ("el sistema en crisis")
  initialCode: string   // Código JS sucio que el jugador recibe
  smells: CodeSmell[]
  tests: TestCase[]
  energyBudget: number  // Energía disponible en el nivel
  maxAttempts: number   // Intentos antes de mostrar sugerencia
  solution: string      // Código refactorizado (para debug/testing)
  smellValidators: Record<string, (code: string) => boolean>
}

/** Un caso de test que se ejecuta en el Web Worker */
export interface TestCase {
  id: string
  description: string
  fn: string            // Código JS serializado del test
}

/** Resultado de ejecutar los tests */
export interface TestResult {
  testId: string
  passed: boolean
  error?: string
}

/** Estado completo del juego en un momento dado */
export interface GameState {
  levelId: number
  code: string
  smellStatus: Record<string, SmellStatus>
  energy: number
  attempts: number
  stability: number    // 0–100
  testResults: TestResult[]
  phase: 'diagnosis' | 'refactor' | 'feedback'
}

/* ── Stealth Assessment (telemetría silenciosa) ── */
export interface TelemetryEvent {
  type:
    | 'smell_detected'
    | 'smell_fixed'
    | 'test_run'
    | 'hint_used'
    | 'level_passed'
    | 'level_failed'
  smellId?: string
  timestamp: number
  attempt?: number
  firstTry?: boolean
}