interface Props {
  lines: string[]
  border?: boolean
}

export function AsciiBox({ lines, border = true }: Props) {
  return (
    <div style={{
      border: border ? '1px solid #2c313a' : 'none',
      borderRadius: border ? 6 : 0,
      background: border ? '#181a1f' : 'transparent',
      lineHeight: 1,
    }}>
      {lines.map((line, i) => (
        <pre key={i} style={{
          margin: 0, padding: 0,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: border && (i === 0 || i === lines.length - 1) ? '#4b5263' : '#abb2bf',
          textAlign: 'center',
          whiteSpace: 'pre',
        }}>{line}</pre>
      ))}
    </div>
  )
}
