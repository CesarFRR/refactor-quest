import type { GameState, Level } from '../types'

interface Props {
  level: Level
  state: GameState
  onNextLevel?: () => void
  onReplay: () => void
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12">
      <polygon
        points="6,1 7.5,4.5 11,5 8.5,7.5 9,11 6,9.5 3,11 3.5,7.5 1,5 4.5,4.5"
        fill={filled ? '#e5c07b' : '#3e4451'}
      />
    </svg>
  )
}

export function LevelComplete({ level, state, onNextLevel, onReplay }: Props) {
  const fixedCount = Object.values(state.smellStatus).filter(s => s === 'fixed').length
  const totalSmells = level.smells.length
  const passedTests = state.testResults.filter(r => r.passed).length
  const totalTests = state.testResults.length
  const score = state.stability * 10 + fixedCount * 50 + (totalTests > 0 && passedTests === totalTests ? 200 : 0)
  const stars = score >= 1000 ? 3 : score >= 600 ? 2 : 1
  const usedEnergy = level.energyBudget - state.energy

  return (
    <>
      <style>{`@keyframes rq-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes rq-slide-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'rq-fade-in 200ms ease',
        }}>
      <div style={{
        background: '#21252b', borderRadius: 10, overflow: 'hidden',
        width: 720, border: '1px solid #181a1f',
        display: 'flex', flexDirection: 'column',
        animation: 'rq-slide-up 300ms ease-out',
      }}>
        {/* Title bar */}
        <div style={{
          background: '#181a1f', padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid #0d0f12',
        }}>
          {['#e06c75','#e5c07b','#98c379'].map(c => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
          ))}
          <span style={{ fontSize: 13, fontWeight: 500, color: '#636d83', letterSpacing: '0.04em' }}>
            RefactorQuest — resultado del nivel
          </span>
        </div>

        <div style={{ display: 'flex', minHeight: 500 }}>
          {/* ── Panel izquierdo ── */}
          <div style={{
            width: 240, flexShrink: 0,
            background: '#21252b', borderRight: '1px solid #181a1f',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #2c313a' }}>
              <div style={{
                fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
                color: '#636d83', textTransform: 'uppercase', marginBottom: 10,
              }}>
                smells corregidos
              </div>
              {level.smells.map(smell => {
                const fixed = state.smellStatus[smell.id] === 'fixed'
                return (
                  <div key={smell.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', fontSize: 14,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: fixed ? '#98c379' : '#e5c07b',
                    }} />
                    <span style={{ flex: 1, color: fixed ? '#636d83' : '#abb2bf' }}>
                      {smell.name}
                    </span>
                    {fixed ? (
                      <span style={{ fontSize: 14, color: '#98c379', fontWeight: 600 }}>✓</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#4b5263' }}>omitido</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ padding: '14px 18px', borderBottom: '1px solid #2c313a' }}>
              <div style={{
                fontSize: 12, fontWeight: 600, letterSpacing: '0.1em',
                color: '#636d83', textTransform: 'uppercase', marginBottom: 10,
              }}>
                estabilidad final
              </div>
              <div style={{ height: 6, background: '#2c313a', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${state.stability}%`,
                  background: state.stability >= 70 ? '#98c379' : state.stability >= 40 ? '#e5c07b' : '#e06c75',
                  borderRadius: 3,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#98c379' }}>{state.stability}%</span>
                <span style={{ fontSize: 11, color: '#636d83' }}>antes: 20%</span>
              </div>
            </div>

            <div style={{ flex: 1 }} />
            <button onClick={onNextLevel} style={{
              margin: '0 18px 10px', padding: '10px 0',
              background: 'rgba(152,195,121,0.12)', color: '#98c379',
              border: '1px solid rgba(152,195,121,0.25)', borderRadius: 5,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              letterSpacing: '0.06em',
            }}>
              siguiente nivel →
            </button>
            <button onClick={onReplay} style={{
              margin: '0 18px 18px', padding: '7px 0',
              background: 'transparent', color: '#4b5263',
              border: '1px solid #3e4451', borderRadius: 5,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, cursor: 'pointer',
              letterSpacing: '0.04em',
            }}>
              repetir nivel
            </button>
          </div>

          {/* ── Panel principal ── */}
          <div style={{
            flex: 1, background: '#282c34',
            display: 'flex', flexDirection: 'column',
            padding: '28px 36px',
          }}>
            {/* Banner */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 6, marginBottom: 20,
              background: 'rgba(152,195,121,0.07)',
              border: '1px solid rgba(152,195,121,0.3)',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                background: 'rgba(152,195,121,0.15)',
              }}>
                <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="8" stroke="#98c379" strokeWidth="1.4"/>
                  <path d="M5.5 9.2l2.3 2.3 4.7-5" stroke="#98c379" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#98c379' }}>
                  nivel superado
                </div>
                <div style={{ fontSize: 12, color: '#636d83', marginTop: 3 }}>
                  sistema estabilizado al {state.stability}% — umbral mínimo: 75%
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontSize: 10, color: '#4b5263', letterSpacing: '0.08em', textTransform: 'uppercase' }}>rango</div>
                <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: stars >= 3 ? '#98c379' : stars >= 2 ? '#e5c07b' : '#61afef' }}>
                  {stars >= 3 ? 'S' : stars >= 2 ? 'A' : 'B'}
                </div>
              </div>
            </div>

            {/* Level info */}
            <div style={{ fontSize: 22, fontWeight: 700, color: '#abb2bf', marginBottom: 2, lineHeight: 1.2 }}>
              {level.title}
            </div>
            <div style={{ fontSize: 12, color: '#4b5263', marginBottom: 20 }}>
              Nivel {level.id} · intento {state.attempts}
            </div>

            {/* Score */}
            <div style={{
              background: '#21252b', borderRadius: 6, border: '1px solid #2c313a',
              padding: '16px 22px', marginBottom: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: 10, color: '#4b5263', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                  puntuación
                </div>
                <div style={{ fontSize: 38, fontWeight: 700, color: '#61afef', lineHeight: 1, letterSpacing: '-0.02em' }}>
                  {score.toLocaleString()}
                </div>
                <div style={{ fontSize: 13, color: '#98c379', fontWeight: 600, marginTop: 4 }}>
                  + {score} pts este nivel
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{ fontSize: 10, color: '#4b5263', letterSpacing: '0.08em', textTransform: 'uppercase' }}>estrellas</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <Star filled={stars >= 1} />
                  <Star filled={stars >= 2} />
                  <Star filled={stars >= 3} />
                </div>
                <div style={{ fontSize: 11, color: '#636d83' }}>
                  {totalSmells - fixedCount > 0
                    ? `${totalSmells - fixedCount} omitido${totalSmells - fixedCount > 1 ? 's' : ''}`
                    : 'todos corregidos'}
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              <Metric label="smells resueltos" value={`${fixedCount} / ${totalSmells}`}
                sub={`${Math.round(fixedCount / totalSmells * 100)}%`} color="#98c379" />
              <Metric label="energía restante" value={`${state.energy} / ${level.energyBudget}`}
                sub={`usaste ${usedEnergy}`} color="#61afef" />
              <Metric label="tests pasando" value={`${passedTests} / ${totalTests}`}
                sub={passedTests === totalTests ? 'todos correctos' : `${totalTests - passedTests} pendiente${totalTests - passedTests > 1 ? 's' : ''}`}
                color="#e5c07b" />
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Badge
                earned={fixedCount === totalSmells}
                icon="🛠"
                name="Refactorizador"
                desc={fixedCount === totalSmells ? 'Todos los smells corregidos' : 'Corrige todos los smells'}
              />
              <Badge
                earned={passedTests === totalTests}
                icon="🧹"
                name="Sin Deuda"
                desc={passedTests === totalTests ? 'Todos los tests pasan' : 'Pasa todos los tests'}
              />
            </div>

            {/* Next level unlock */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: '#21252b', borderRadius: 6, border: '1px solid #2c313a',
              padding: '12px 16px', marginTop: 16,
            }}>
              <span style={{ fontSize: 13, color: '#3e4451', fontWeight: 600 }}>→</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#4b5263', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>
                  siguiente nivel desbloqueado
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#abb2bf' }}>
                  Nivel 2 · "Próximamente"
                </div>
              </div>
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 3, fontWeight: 600,
                background: 'rgba(152,195,121,0.1)', color: '#98c379', border: '1px solid rgba(152,195,121,0.2)',
              }}>nuevo</span>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          background: '#181a1f', borderTop: '1px solid #0d0f12',
          padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0,
        }}>
          <StatusItem dot="#98c379" label="tests" value={`${passedTests}/${totalTests}`} color="#98c379" />
          <StatusItem dot="#61afef" label="puntuación total" value={`${score} pts`} color="#61afef" />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: '#4b5263' }}>
            nivel {level.id} completado · rango {stars >= 3 ? 'S' : stars >= 2 ? 'A' : 'B'}
          </span>
        </div>
        </div>
      </div>
    </div>
    </>
  )
}

function Metric({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{
      background: '#21252b', borderRadius: 6, border: '1px solid #2c313a', padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, color: '#4b5263', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, marginBottom: 3, color }}>
        {value}
      </div>
      <div style={{ fontSize: 10, color: '#636d83' }}>{sub}</div>
    </div>
  )
}

function Badge({ earned, icon, name, desc }: { earned: boolean; icon: string; name: string; desc: string }) {
  return (
    <div style={{
      flex: 1,
      background: earned ? 'rgba(97,175,239,0.05)' : '#21252b',
      borderRadius: 6, border: earned ? '1px solid rgba(97,175,239,0.25)' : '1px solid #2c313a',
      padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 4,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0,
        background: earned ? 'rgba(97,175,239,0.12)' : '#2c313a',
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: earned ? '#61afef' : '#abb2bf', marginBottom: 2,
        }}>
          {name}
        </div>
        <div style={{ fontSize: 10, color: '#4b5263', lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  )
}

function StatusItem({ dot, label, value, color }: { dot: string; label: string; value: string; color: string }) {
  return (
    <span style={{ fontSize: 11, color: '#636d83', display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
      {label} <span style={{ fontWeight: 600, color }}>{value}</span>
    </span>
  )
}
