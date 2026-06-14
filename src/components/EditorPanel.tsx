/* ============================================================
   RefactorQuest — EditorPanel
   Panel derecho (~70%): Monaco Editor con tema One Dark Pro.
   ============================================================ */
import Editor, { useMonaco } from '@monaco-editor/react'
import type { CodeSmell } from '../types'
import { useEffect } from 'react'

// Tema One Dark Pro en formato Monaco
const ONE_DARK_PRO = {
  base: 'vs-dark' as const,
  inherit: true,
  rules: [
    { token: 'comment',    foreground: '5c6370', fontStyle: 'italic' },
    { token: 'keyword',    foreground: 'c678dd' },
    { token: 'string',     foreground: '98c379' },
    { token: 'number',     foreground: 'd19a66' },
    { token: 'type',       foreground: 'e5c07b' },
    { token: 'function',   foreground: '61afef' },
    { token: 'variable',   foreground: 'e06c75' },
  ],
  colors: {
    'editor.background':             '#282c34',
    'editor.foreground':             '#abb2bf',
    'editor.lineHighlightBackground':'#2c313a',
    'editor.selectionBackground':    '#3e4451',
    'editorCursor.foreground':       '#61afef',
    'editorLineNumber.foreground':   '#636d83',
    'editorGutter.background':       '#21252b',
    'scrollbar.shadow':              '#00000000',
  },
}

interface Props {
  code: string
  smells: CodeSmell[]
  onChange: (value: string) => void
}

export function EditorPanel({ code, smells, onChange }: Props) {
  const monaco = useMonaco()

  // Registrar tema One Dark Pro cuando Monaco esté listo
  useEffect(() => {
    if (!monaco) return
    monaco.editor.defineTheme('one-dark-pro', ONE_DARK_PRO)
    monaco.editor.setTheme('one-dark-pro')
  }, [monaco])

  // Decoraciones: subrayados ondulados sobre los smells
  useEffect(() => {
    if (!monaco) return
    const editors = monaco.editor.getEditors()
    if (editors.length === 0) return
    const ed = editors[0]

    const decorations = smells.map((smell) => ({
      range: new monaco.Range(smell.lineStart, 1, smell.lineEnd, 1),
      options: {
        isWholeLine: true,
        className:
          smell.severity === 'critical' ? 'smell-crit-line' : 'smell-warn-line',
        glyphMarginClassName:
          smell.severity === 'critical' ? 'smell-crit-glyph' : 'smell-warn-glyph',
        hoverMessage: { value: `**${smell.name}** — ${smell.description}` },
      },
    }))

    ed.createDecorationsCollection(decorations)
  }, [monaco, smells])

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        theme="one-dark-pro"
        onChange={(v) => onChange(v ?? '')}
        options={{
          fontSize: 15,
          lineHeight: 24,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          smoothScrolling: false,
          scrollBeyondLastLine: false,
          renderLineHighlight: 'line',
          glyphMargin: true,
          cursorBlinking: 'solid',
          tabSize: 2,
          wordWrap: 'on',
        }}
      />
    </div>
  )
}