import type { Level, Severity, Domain, TutorialConfig, AvatarStep, SmellRange } from '../types'
import type { TestCase } from '../types'

interface RawAvatarStep {
  trigger: AvatarStep['trigger']
  message: string
  highlightLine?: number
  highlightRange?: { start: number; end: number }
  waitForSmell?: string
  injectCode?: string
  zone?: AvatarStep['zone']
  interactiveLock?: boolean
  cinematicBlur?: boolean
  mood?: string
}

interface RawTutorial {
  avatarMode: TutorialConfig['avatarMode']
  guidedSmellId?: string
  guidedInjection?: string
  steps?: RawAvatarStep[]
  hintAfterIdleMs?: number
  hintAfterFails?: number
  autoRunTests?: boolean
}

interface RawLevel {
  id: number
  title: string
  narrative: string
  energyBudget: number
  maxAttempts: number
  initialCode: string
  solution: string
  smells: Array<{
    id: string
    name: string
    severity: string
    description: string
    lineStart: number
    lineEnd: number
    energyCost: number
  }>
  tests: Array<{
    id: string
    description: string
    fn: string
  }>
  validators: Record<string, string>
  domain?: Domain
  tutorial?: RawTutorial
}

export function loadLevel(raw: RawLevel): Level {
  const validators: Record<string, (code: string) => number | { score: number; ranges: SmellRange[] }> = {}
  for (const [key, body] of Object.entries(raw.validators)) {
    const rawFn = new Function('code', body) as (code: string) => unknown
    validators[key] = (code: string): number | { score: number; ranges: SmellRange[] } => {
      const result = rawFn(code)
      if (typeof result === 'object' && result !== null && 'score' in result) {
        const r = result as { score: number; ranges?: SmellRange[] }
        return { score: Math.max(0, Math.min(1, r.score)), ranges: r.ranges ?? [] }
      }
      if (typeof result === 'number') return Math.max(0, Math.min(1, result))
      return result ? 1 : 0
    }
  }
  return {
    id: raw.id,
    title: raw.title,
    narrative: raw.narrative,
    energyBudget: raw.energyBudget,
    maxAttempts: raw.maxAttempts,
    initialCode: raw.initialCode,
    solution: raw.solution,
    smells: raw.smells.map(s => ({
      ...s,
      severity: s.severity as Severity,
    })),
    tests: raw.tests as TestCase[],
    smellValidators: validators,
    domain: raw.domain,
    tutorial: raw.tutorial,
  }
}

const modules = import.meta.glob<{ default: RawLevel }>('../levels/*.json', { eager: true })

/** Extrae el número de nivel del nombre de archivo (level-N.json) para ordenar. */
function levelIndexFromPath(path: string): number {
  const m = path.match(/level-(\d+)\.json$/)
  return m ? parseInt(m[1], 10) : 0
}

export const levels: Level[] = Object.entries(modules)
  .sort(([a], [b]) => levelIndexFromPath(a) - levelIndexFromPath(b))
  .map(([, mod]) => loadLevel(mod.default))
