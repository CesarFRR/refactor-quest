import type { CodeSmell, SmellStatus, TestResult } from '../types'

const STARS_KEY = 'refactorquest-stars'

export function loadStars(): Record<number, number> {
  try {
    return JSON.parse(localStorage.getItem(STARS_KEY) ?? '{}')
  } catch { return {} }
}

export function saveStarsEntry(levelId: number, stars: number): void {
  const all = loadStars()
  all[levelId] = stars
  localStorage.setItem(STARS_KEY, JSON.stringify(all))
}

export function calcDebtPct(smells: CodeSmell[], status: Record<string, SmellStatus>): number {
  let total = 0, remaining = 0
  for (const s of smells) {
    total += s.energyCost
    if (status[s.id] !== 'fixed') remaining += s.energyCost
  }
  return total > 0 ? remaining / total : 0
}

export function calcStars(
  smells: CodeSmell[],
  status: Record<string, SmellStatus>,
  testResults: TestResult[],
): number {
  const debt = calcDebtPct(smells, status)
  const allTestsPassed = testResults.length > 0 && testResults.every(r => r.passed)
  if (debt === 0 && allTestsPassed) return 3
  if (debt <= 0.5 && allTestsPassed) return 2
  return 1
}
