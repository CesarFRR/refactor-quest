/* ============================================================
   RefactorQuest — RetroTitle
   Título "REFACTOR QUEST" en SVG con estilo retro/terminal.
   Reemplaza el ASCII art de asciiArt.ts.
   ============================================================ */

interface Props {
  width?: number
}

export function RetroTitle({ width = 480 }: Props) {
  const height = Math.round(width * 0.18)

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 480 86"
      style={{ display: 'block' }}
    >
      <defs>
        {/* Glow para el título */}
        <filter id="retro-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Gradiente verde-amarillo */}
        <linearGradient id="retro-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#98c379" />
          <stop offset="50%" stopColor="#e5c07b" />
          <stop offset="100%" stopColor="#61afef" />
        </linearGradient>
      </defs>

      {/* REFACTOR */}
      <text
        x="240" y="36"
        textAnchor="middle"
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        fontSize="34"
        fontWeight="700"
        letterSpacing="6"
        fill="url(#retro-grad)"
        filter="url(#retro-glow)"
      >
        REFACTOR
      </text>

      {/* QUEST (más pequeño, debajo) */}
      <text
        x="240" y="70"
        textAnchor="middle"
        fontFamily="'JetBrains Mono', 'Fira Code', monospace"
        fontSize="24"
        fontWeight="700"
        letterSpacing="10"
        fill="#61afef"
        opacity="0.85"
        filter="url(#retro-glow)"
      >
        QUEST
      </text>

      {/* Línea decorativa */}
      <line
        x1="80" y1="80" x2="400" y2="80"
        stroke="#3e4451" strokeWidth="1"
        strokeDasharray="4 4"
      />
    </svg>
  )
}
