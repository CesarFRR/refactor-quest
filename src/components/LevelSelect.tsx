import { useState } from 'react'
import type { Level } from '../types'

interface Props {
  levels: Level[]
  unlockedLevels: Set<number>
  stars: Record<number, number>
  onSelectLevel: (index: number) => void
  onBack: () => void
}

const GRID_COLS = 4
const GRID_ROWS = 3
const TOTAL_SLOTS = GRID_COLS * GRID_ROWS

export function LevelSelect({ levels, unlockedLevels, stars, onSelectLevel, onBack }: Props) {
  const [page, setPage] = useState(0)
  const totalPages = Math.max(1, Math.ceil(levels.length / TOTAL_SLOTS))
  const offset = page * TOTAL_SLOTS

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: '#21252b', fontFamily: "'JetBrains Mono', monospace",
    }}>
      <header style={{
        height: 40, flexShrink: 0,
        background: '#181a1f', borderBottom: '1px solid #0d0f12',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
      }}>
        {['#e06c75','#e5c07b','#98c379'].map(c => (
          <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ fontSize: 13, fontWeight: 500, color: '#636d83', letterSpacing: '0.04em' }}>
          RefactorQuest — seleccionar nivel
        </span>
      </header>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '30px 60px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gap: 16,
          width: '100%',
          maxWidth: 640,
        }}>
          {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
            const idx = offset + i
            const level = levels[idx]
            const exists = !!level
            const unlocked = exists && unlockedLevels.has(level.id)

            if (!exists) {
              return <EmptySlot key={i} index={idx} />
            }
            if (!unlocked) {
              return <LockedSlot key={level.id} level={level} />
            }
            return (
              <button
                key={level.id}
                onClick={() => onSelectLevel(idx)}
                style={{
                  aspectRatio: '1',
                  padding: '16px 10px',
                  background: '#181a1f',
                  border: '1px solid #2c313a',
                  borderRadius: 6,
                  color: '#abb2bf',
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'border-color 150ms ease, background 150ms ease',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#61afef'
                  e.currentTarget.style.background = '#21252b'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#2c313a'
                  e.currentTarget.style.background = '#181a1f'
                }}
              >
                <div style={{
                  fontSize: 10, color: '#4b5263',
                  letterSpacing: '0.08em',
                }}>
                  NIVEL {level.id.toString().padStart(2, '0')}
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 600, color: '#61afef',
                  lineHeight: 1.3,
                }}>
                  {level.title}
                </div>
                {stars[level.id] != null && (
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[1,2,3].map(i => (
                      <span key={i} style={{
                        fontSize: 10,
                        color: i <= (stars[level.id] ?? 0) ? '#e5c07b' : '#3e4451',
                      }}>
                        ★
                      </span>
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Paginación < > ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16,
          marginTop: 20,
        }}>
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            style={{
              padding: '8px 16px',
              background: page === 0 ? '#181a1f' : '#2c313a',
              border: '1px solid #3e4451',
              borderRadius: 4,
              color: page === 0 ? '#3e4451' : '#abb2bf',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16, fontWeight: 700,
              cursor: page === 0 ? 'not-allowed' : 'pointer',
              transition: 'background 100ms ease',
            }}
          >
            ‹
          </button>
          <span style={{
            fontSize: 12, color: '#636d83', letterSpacing: '0.06em',
          }}>
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            style={{
              padding: '8px 16px',
              background: page >= totalPages - 1 ? '#181a1f' : '#2c313a',
              border: '1px solid #3e4451',
              borderRadius: 4,
              color: page >= totalPages - 1 ? '#3e4451' : '#abb2bf',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 16, fontWeight: 700,
              cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
              transition: 'background 100ms ease',
            }}
          >
            ›
          </button>
        </div>

        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none',
            color: '#4b5263', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 12, cursor: 'pointer', marginTop: 24,
            letterSpacing: '0.04em',
          }}
        >
          ← volver al menú
        </button>
      </div>

      <footer style={{
        height: 32, flexShrink: 0,
        background: '#181a1f', borderTop: '1px solid #0d0f12',
        display: 'flex', alignItems: 'center', padding: '0 16px',
      }}>
        <span style={{ fontSize: 10, color: '#4b5263' }}>
          {levels.length} nivel{levels.length > 1 ? 'es' : ''} disponible{levels.length > 1 ? 's' : ''}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#3e4451' }}>
          {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  )
}

function EmptySlot({ index }: { index: number }) {
  return (
    <div style={{
      aspectRatio: '1',
      padding: '16px 10px',
      background: '#1e2127',
      border: '1px dashed #2c313a',
      borderRadius: 6,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 4,
    }}>
      <div style={{ fontSize: 10, color: '#3e4451', letterSpacing: '0.08em' }}>
        NIVEL {(index + 1).toString().padStart(2, '0')}
      </div>
      <div style={{ fontSize: 10, color: '#3e4451' }}>
        ───
      </div>
    </div>
  )
}

function LockedSlot({ level }: { level: Level }) {
  return (
    <div style={{
      aspectRatio: '1',
      padding: '16px 10px',
      background: '#1e2127',
      border: '1px solid #2c313a',
      borderRadius: 6,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 6,
    }}>
      <div style={{ fontSize: 10, color: '#4b5263', letterSpacing: '0.08em' }}>
        NIVEL {level.id.toString().padStart(2, '0')}
      </div>
      <div style={{ fontSize: 16, opacity: 0.5 }}>
        🔒
      </div>
    </div>
  )
}
