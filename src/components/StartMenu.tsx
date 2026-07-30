import { useState } from 'react'
import { RetroTitle } from './RetroTitle'

interface Props {
  onStart: () => void
  levelCount: number
}

const FONTS = [
  { id: 'vt323', label: 'VT323', family: "'VT323', 'JetBrains Mono', monospace", style: { color: '#98c379' } },
  { id: 'pixelify', label: 'Pixelify Sans', family: "'Pixelify Sans', 'JetBrains Mono', monospace", style: { color: '#61afef' } },
  { id: 'jetbrains', label: 'JetBrains Mono', family: "'JetBrains Mono', monospace", style: { color: '#e5c07b' } },
]

export function StartMenu({ onStart, levelCount }: Props) {
  const [pressing, setPressing] = useState(false)
  const [fontIndex, setFontIndex] = useState(0)
  const currentFont = FONTS[fontIndex]

  return (
    <div style={{
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: '#21252b',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <header style={{
        height: 40, flexShrink: 0,
        background: '#181a1f',
        borderBottom: '1px solid #0d0f12',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10,
      }}>
        {['#e06c75','#e5c07b','#98c379'].map(c => (
          <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
        ))}
        <span style={{ fontSize: 13, fontWeight: 500, color: '#636d83', letterSpacing: '0.04em' }}>
          RefactorQuest — menú principal
        </span>
      </header>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12,
      }}>
        <RetroTitle width={1000} fontFamily={currentFont.family} />

        <div style={{
          fontSize: 13, color: '#636d83', marginTop: 8,
          letterSpacing: '0.04em',
        }}>
          「 un juego de refactorización de código 」
        </div>

        <button
          onMouseDown={() => setPressing(true)}
          onMouseUp={() => { setPressing(false); onStart() }}
          onMouseLeave={() => setPressing(false)}
          style={{
            marginTop: 24,
            padding: '12px 60px',
            background: pressing ? '#3a8b5e' : '#98c379',
            color: '#1e2127',
            border: 'none',
            borderRadius: 6,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.15em',
            cursor: 'pointer',
            transform: pressing ? 'scale(0.96)' : 'scale(1)',
            transition: 'transform 80ms ease, background 80ms ease',
            boxShadow: pressing
              ? 'inset 0 2px 6px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(152,195,121,0.25)',
            outline: 'none',
          }}
        >
          ▶ PLAY
        </button>

        <div style={{ display: 'flex', gap: 6, marginTop: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: '#4b5263', letterSpacing: '0.06em' }}>
            tipo:
          </span>
          {FONTS.map((f, i) => (
            <button
              key={f.id}
              onClick={() => setFontIndex(i)}
              style={{
                background: i === fontIndex ? '#2c313a' : 'transparent',
                border: i === fontIndex ? '1px solid #4b5263' : '1px solid transparent',
                borderRadius: 4,
                padding: '3px 10px',
                fontFamily: f.family,
                fontSize: 13,
                color: f.style.color,
                cursor: 'pointer',
                transition: 'background 100ms ease, border-color 100ms ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <footer style={{
        height: 32, flexShrink: 0,
        background: '#181a1f',
        borderTop: '1px solid #0d0f12',
        display: 'flex', alignItems: 'center', padding: '0 16px',
      }}>
        <span style={{ fontSize: 10, color: '#4b5263' }}>
          {levelCount} nivel{levelCount > 1 ? 'es' : ''} disponible{levelCount > 1 ? 's' : ''}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#3e4451' }}>
          {new Date().getFullYear()}
        </span>
      </footer>
    </div>
  )
}
