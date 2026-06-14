# RefactorQuest

Un juego serio (ABJ) para aprender refactorización de código. El jugador asume el rol de un ingeniero forense que debe diagnosticar y corregir *code smells* en un sistema legacy, escribiendo código real en el editor Monaco (VS Code).

## Stack

| Componente | Tecnología |
|-----------|-----------|
| Lenguaje | JavaScript (ES6+) |
| Frontend | React 19 + TypeScript |
| Editor | Monaco Editor |
| Tema | One Dark Pro |
| Build | Vite 8 |
| Tests | Web Worker (sandbox) |

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy (GitHub Pages)

```bash
npm run deploy
```

Configurar en GitHub: `Settings > Pages > Source: Deploy from a branch > gh-pages > / (root)`.

## Diseño (resumen)

El diseño sigue el marco LM-GM (Arnab et al., 2015) y los principios EDTF (Maxim, 2025). El *core loop* del juego es:

> Observar código → Diagnosticar smells → Refactorizar (editar) → Ejecutar tests → Feedback → (repetir)

El jugador pasa el 80% del tiempo en los pasos de Observar, Diagnosticar y Editar — todo ocurre en el mismo espacio (Monaco Editor).

### Mapeo LM–SGM–GM

| Learning Mechanic | Nivel Bloom | SGM | Game Mechanic |
|------------------|------------|-----|---------------|
| Observation | Analyze | Diagnosticar código | Feedback, Realism |
| Identify | Understand | Detectar code smells | Selecting / Collecting |
| Hypothesis | Evaluate | Priorizar con recursos limitados | Resource Management |
| Action / Task | Apply | Escribir código real | Design / Editing |
| Feedback | transversal | Tests automáticos | Levels, Progression |
| Motivation | afectivo | Narrativa de "sistema en crisis" | Rewards / Status |

### Principios EDTF

- **Cognitiva**: panel ligero (~30%), sin popups modales
- **Afectiva**: tests fallidos sin penalización, sin GAME OVER
- **Física**: One Dark Pro, JetBrains Mono 15px, sin animaciones intrusivas

## Estructura del proyecto

```
src/
  levels/        ← Niveles en JSON (portables, generables por IA)
    level-1.json
  utils/
    loadLevel.ts ← Descubre JSONs con import.meta.glob y los carga
  components/    ← StartMenu, LevelSelect, SmellPanel, EditorPanel, LevelComplete
  hooks/         ← useGameState, useTestRunner
  data/          ← ASCII art compartido
  workers/       ← testRunner.worker.ts (sandbox para tests)
```

## Autor

**César Fabián Rincón Robayo** — crinconro@unal.edu.co  
Curso ABJ-d, Universidad Nacional de Colombia, sede Bogotá

## Licencia

MIT
