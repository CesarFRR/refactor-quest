/* ============================================================
   RefactorQuest — EditorPanel
   Panel derecho (~70%): Monaco Editor con tema One Dark Pro.
   Expone markers de sintaxis (Capa 1 de inmediatez) y resalta
   la línea que el avatar Cody señala.

   Sugerencias limitadas al código del editor (sin APIs nativas):
   noLib=true deshabilita lib.d.ts, wordBasedSuggestions=off
   evita sugerir palabras al azar.
   ============================================================ */
import Editor, { useMonaco, loader } from '@monaco-editor/react'
import * as monacoPkg from 'monaco-editor'
import type { editor } from 'monaco-editor'
import type { CodeSmell, SyntaxMarker } from '../types'
import { useEffect, useRef } from 'react'

// Usar la copia local de Monaco en lugar de cargar desde CDN
loader.config({ monaco: monacoPkg })

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
  avatarHighlightLine?: number
  onMarkersChange?: (markers: SyntaxMarker[]) => void
  /** Si true, el editor es readOnly (bloqueo tutorial de Cody) */
  readOnly?: boolean
  /** Cody está escribiendo código (animación) */
  avatarInjecting?: boolean
  /** Código destino que Cody está tipeando */
  injectTarget?: string
  /** Se llama cuando la animación de tipeo termina */
  onInjectionComplete?: () => void
}

export function EditorPanel({ code, smells, onChange, avatarHighlightLine, onMarkersChange, readOnly, avatarInjecting, injectTarget, onInjectionComplete }: Props) {
  const monaco = useMonaco()
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const smellDecoRef = useRef<editor.IEditorDecorationsCollection | null>(null)
  const avatarDecoRef = useRef<editor.IEditorDecorationsCollection | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!avatarInjecting || !injectTarget || !editorRef.current || !monaco) {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
      return
    }
    const model = editorRef.current.getModel()
    if (!model) return
    // Tipeo por bloques vía API de Monaco
    const CHUNK = 8
    let pos = 0
    const typeChunk = () => {
      const next = Math.min(pos + CHUNK, injectTarget.length)
      model.setValue(injectTarget.slice(0, next))
      pos = next
      if (pos >= injectTarget.length) {
        typingTimerRef.current = null
        onInjectionComplete?.()
        return
      }
      const delay = injectTarget.slice(pos - CHUNK, next).includes('\n') ? 80 : 50 + Math.random() * 30
      typingTimerRef.current = setTimeout(typeChunk, delay)
    }
    typingTimerRef.current = setTimeout(typeChunk, 150)
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current)
        typingTimerRef.current = null
      }
    }
  }, [avatarInjecting, injectTarget, onInjectionComplete, monaco])

  // Registrar tema One Dark Pro cuando Monaco esté listo
  useEffect(() => {
    if (!monaco) return
    monaco.editor.defineTheme('one-dark-pro', ONE_DARK_PRO)
    monaco.editor.setTheme('one-dark-pro')
    const ts = (monaco.languages as unknown as {
      typescript?: {
        javascriptDefaults?: {
          setCompilerOptions: (opts: Record<string, unknown>) => void
          setDiagnosticsOptions: (opts: Record<string, unknown>) => void
        }
      }
    }).typescript
    if (ts?.javascriptDefaults) {
      ts.javascriptDefaults.setCompilerOptions({
        noLib: true,
        allowNonTsExtensions: true,
        target: 99,
        allowJs: true,
      })
      ts.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
      })
    }
  }, [monaco])

  // Notificar markers al hook (Capa 1: sintaxis en tiempo real)
  useEffect(() => {
    if (!monaco || !editorRef.current || !onMarkersChange) return
    const model = editorRef.current.getModel()
    if (!model) return
    const push = () => {
      try {
        const model = editorRef.current?.getModel()
        if (!model) return
        const raw = monaco.editor.getModelMarkers({ resource: model.uri })
        const markers: SyntaxMarker[] = raw.map(m => ({
          line: m.startLineNumber,
          column: m.startColumn,
          message: m.message,
          severity: m.severity === monaco.MarkerSeverity.Error ? 'error'
            : m.severity === monaco.MarkerSeverity.Warning ? 'warning' : 'info',
        }))
        onMarkersChange(markers)
      } catch {
        // Monaco lanza "cancelation" cuando el modelo se desecha
      }
    }
    push()
    const sub = monaco.editor.onDidChangeMarkers(() => push())
    return () => sub.dispose()
  }, [monaco, onMarkersChange])

  // Decoraciones: subrayados ondulados sobre los smells.
  useEffect(() => {
    if (!monaco || !editorRef.current) return
    const ed = editorRef.current
    if (smellDecoRef.current) {
      smellDecoRef.current.clear()
      smellDecoRef.current = null
    }
    const decorations = smells.map((smell) => ({
      range: new monaco.Range(smell.lineStart, 1, smell.lineEnd, 1),
      options: {
        isWholeLine: true,
        className:
          smell.severity === 'critical' ? 'smell-crit-line' : 'smell-warn-line',
        glyphMarginClassName:
          smell.severity === 'critical' ? 'smell-crit-glyph' : 'smell-warn-glyph',
        glyphMarginHoverMessage: { value: `**${smell.name}** — ${smell.description}` },
      },
    }))
    smellDecoRef.current = ed.createDecorationsCollection(decorations)
    return () => {
      if (smellDecoRef.current) {
        smellDecoRef.current.clear()
        smellDecoRef.current = null
      }
    }
  }, [monaco, smells])

  // Resaltar línea señalada por el avatar
  useEffect(() => {
    if (!monaco || !editorRef.current) return
    const ed = editorRef.current
    if (avatarDecoRef.current) {
      avatarDecoRef.current.clear()
      avatarDecoRef.current = null
    }
    if (!avatarHighlightLine) return
    const deco = [{
      range: new monaco.Range(avatarHighlightLine, 1, avatarHighlightLine, 1),
      options: {
        isWholeLine: true,
        className: 'avatar-highlight-line',
        glyphMarginClassName: 'avatar-glyph',
        overviewRuler: { color: '#61afef', position: 4 },
      },
    }]
    avatarDecoRef.current = ed.createDecorationsCollection(deco)
    return () => {
      if (avatarDecoRef.current) {
        avatarDecoRef.current.clear()
        avatarDecoRef.current = null
      }
    }
  }, [monaco, avatarHighlightLine])

  return (
    <div style={{
      flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {avatarInjecting && (
        <div style={{
          position: 'absolute', inset: 0,
          zIndex: 100,
          pointerEvents: 'none',
        }} />
      )}
      {readOnly && !avatarInjecting && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 100,
          pointerEvents: 'none',
        }} />
      )}
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={avatarInjecting ? undefined : code}
        theme="one-dark-pro"
        onMount={(ed) => { editorRef.current = ed }}
        onChange={(v) => {
          if (!avatarInjecting) onChange(v ?? '')
        }}
        options={{
          readOnly: readOnly || avatarInjecting || false,
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
          'semanticHighlighting.enabled': true,
          quickSuggestions: { other: false, comments: false, strings: false },
          suggestOnTriggerCharacters: false,
          acceptSuggestionOnEnter: 'off',
          wordBasedSuggestions: 'off',
          suggest: {
            showWords: false,
            showSnippets: false,
            showClasses: false,
            showFunctions: false,
            showVariables: true,
            showModules: false,
            showKeywords: false,
            showValues: false,
            showConstants: false,
            showConstructors: false,
            showEvents: false,
            showFields: false,
            showEnums: false,
            showEnumMembers: false,
            showMethods: false,
            showProperties: false,
            showColors: false,
            showFiles: false,
            showReferences: false,
            showFolders: false,
            showTypeParameters: false,
            showIssues: false,
            showUsers: false,
          },
          parameterHints: { enabled: false },
        }}
      />
    </div>
  )
}
