import type { Level, Severity } from '../types'
import type { TestCase } from '../types'

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
}

export function loadLevel(raw: RawLevel): Level {
  const validators: Record<string, (code: string) => boolean> = {}
  for (const [key, body] of Object.entries(raw.validators)) {
    validators[key] = new Function('code', body) as (code: string) => boolean
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
  }
}

const modules = import.meta.glob<{ default: RawLevel }>('../levels/*.json', { eager: true })

export const levels: Level[] = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, mod]) => loadLevel(mod.default))
