/* ============================================================
   RefactorQuest — Tipos compartidos
   ============================================================ */

/** Severidades posibles de un code smell */
export type Severity = 'critical' | 'warning' | 'info'

/** Estado de un smell dentro del nivel */
export type SmellStatus = 'pending' | 'partial' | 'fixed' | 'skipped'

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

/** Dominio temático del nivel (para pédagogía por capas) */
export type Domain = 'billing' | 'payroll'

/** Modos de intervención del avatar Cody */
export type AvatarMode =
  | 'reveal-solution'   // Cody hace todo, jugador observa (nivel 0)
  | 'walkthrough'       // Cody guía paso a paso (niveles 1-2)
  | 'hint-on-stuck'     // Cody mudo hasta que el jugador se traba (niveles 3-4)
  | 'guided-smell'      // Cody resuelve 1 smell y suelta al jugador (nivel 6)
  | 'off'               // Cody mudo permanente (nivel 5)

/**
 * Zona del juego donde Cody se posiciona para señalar.
 * - 'bottom-right': posición por defecto (esquina inferior derecha)
 * - 'panel': Cody se mueve junto al SmellPanel (izquierda)
 * - 'editor': Cody se mueve junto al EditorPanel (derecha)
 * - 'footer': Cody se mueve junto a la barra inferior
 */
export type AvatarZone = 'bottom-right' | 'panel' | 'editor' | 'footer'

/** Triggers que avanzan los pasos del walkthrough */
export type AvatarTrigger =
  | 'level-start'
  | 'smell-fixed'
  | 'syntax-error'
  | 'idle-ms'
  | 'test-failed'
  | 'step-confirmed'

/**
 * IDs de zonas de la UI que el avatar puede señalar con un rectángulo
 * de resalte (ver ZoneHighlightOverlay).
 */
export const ZONE_IDS = {
  EDITOR:       'editor',
  MISSION:      'mission',
  SMELLS_LIST:  'smells-list',
  STABILITY:    'stability',
  ENERGY:       'energy',
  SUGGESTION:   'suggestion',
  RUN_TESTS:    'run-tests',
  TEST_RESULTS: 'test-results',
  HEADER_STATS: 'header-stats',
} as const

export type ZoneId = (typeof ZONE_IDS)[keyof typeof ZONE_IDS]

/** Un paso del walkthrough guiado por Cody */
export interface AvatarStep {
  trigger: AvatarTrigger
  message: string
  highlightLine?: number
  /** ID de zona de UI a resaltar (misión, smells, botón tests, etc.) */
  highlightZone?: ZoneId
  /** ID del smell que debe quedar 'fixed' para avanzar (cuando trigger es 'smell-fixed') */
  waitForSmell?: string
  /** Para 'reveal-solution': código que Cody escribe en el editor en este paso */
  injectCode?: string
  /**
   * Zona donde Cody se posiciona durante este paso.
   * Si se omite, Cody se queda en 'bottom-right'.
   */
  zone?: AvatarZone
  /**
   * Si true, bloquea la interacción del jugador (editor, panel) durante
   * este paso. Útil para tutoriales donde Cody explica algo y el jugador
   * no debe hacer click aún. El botón "Siguiente" de la nubecita sigue activo.
   */
  interactiveLock?: boolean
  /** Si true, difumina todo excepto Cody y su burbuja (efecto cinematográfico) */
  cinematicBlur?: boolean
}

/** Configuración del tutorial de un nivel */
export interface TutorialConfig {
  avatarMode: AvatarMode
  /** Para 'guided-smell': ID del smell que Cody refactoriza por el jugador */
  guidedSmellId?: string
  /** Código que Cody inyecta para resolver el smell guiado */
  guidedInjection?: string
  /** Secuencia de pasos para 'walkthrough' y 'reveal-solution' */
  steps?: AvatarStep[]
  /** Para 'hint-on-stuck': ms de inactividad antes de sugerir */
  hintAfterIdleMs?: number
  /** Para 'hint-on-stuck': intentos fallidos antes de sugerir */
  hintAfterFails?: number
  /** Si true, los tests se ejecutan automáticamente cuando compila + validators pasan */
  autoRunTests?: boolean
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
  /** Validators que devuelven un número 0-1 (fracción de progreso del smell) */
  smellValidators: Record<string, (code: string) => number>
  domain?: Domain
  tutorial?: TutorialConfig
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

/** Estado de compilación del código del jugador (inmediatez — Capa 2) */
export type CompileStatus = 'idle' | 'ok' | 'syntax-error'

/** Informe de un marker de sintaxis de Monaco */
export interface SyntaxMarker {
  line: number
  column: number
  message: string
  severity: 'error' | 'warning' | 'info'
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
  compileStatus: CompileStatus
  syntaxError?: string
  avatarStep: number
  avatarActive: boolean
  avatarMessage?: string
  avatarHighlightLine?: number
  /** Zona de UI que Cody señala con rectángulo */
  avatarHighlightZone?: ZoneId
  /** Si true, Cody está "escribiendo" código (animación de inyección) */
  avatarInjecting?: boolean
  /** Si true, difumina todo excepto Cody (efecto cinematográfico) */
  avatarCinematicBlur?: boolean
  /** Zona actual de Cody (para moverse por el juego) */
  avatarZone: AvatarZone
  /** Si true, el jugador no puede interactuar con editor/panel (bloqueo tutorial) */
  interactiveLock: boolean
  /** Progreso fraccional de cada smell (0-1) para estabilidad precisa */
  smellProgress: Record<string, number>
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
    | 'avatar_intervention'
    | 'syntax_error'
  smellId?: string
  timestamp: number
  attempt?: number
  firstTry?: boolean
  /** Para 'avatar_intervention': qué triggered la ayuda */
  trigger?: string
  /** Para 'avatar_intervention': modo del avatar */
  avatarMode?: AvatarMode
}