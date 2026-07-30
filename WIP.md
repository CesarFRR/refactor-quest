# WIP — RefactorQuest: Work In Progress

> Plan de evolución post-entrega del curso ABJ-d (Julio 2026).
> Autor: César Fabián Rincón Robayo

---

## Estado actual

| Aspecto | Estado |
|---------|--------|
| Prototipo | Terminado, jugable, 7 niveles (0–6) |
| Reporte final | Entregado y evaluado por pares |
| Deploy | https://cesarfrr.github.io/refactor-quest/ |
| Repo | https://github.com/CesarFRR/refactor-quest |
| Branch principal | `main` |

## Feedback de evaluación (3 revisores + profesor)

### Bugs críticos (Tier 0 — ya corregidos en su mayoría)

- [x] Ctrl+Z reinicia nivel — corregido
- [x] Contraste de texto ilegible (botón "volver") — corregido
- [x] Victory screen al completar nivel 6 — corregido
- [x] Sistema de estrellas (3/2/1) implementado
- [ ] Dashboard de stealth assessment al final del juego (no implementado)

### Problemas de diseño (Tier 1)

- [x] Energía nunca se agotaba — corregido con 70/30 weighted scoring
- [ ] Tests no validan calidad, solo comportamiento — pendiente (AST analysis)
- [ ] Identify: sistema detecta smells, no el jugador — aceptado como introductorio
- [ ] Pistas de Cody duplicadas — corregido
- [ ] Conclusiones del reporte reformuladas en términos de viabilidad

### Observaciones menores

- [ ] Tabla 1: atribuye validadores que no aparecen en el stack
- [ ] 5 referencias no citadas en el cuerpo
- [ ] Järvinen (2008) ausente en referencias

---

## Próximos pasos: Fase 1 — Pulir V2 (~2 semanas)

### Dashboard de Stealth Assessment

Pantalla final tras nivel 6 que muestre:
- Tiempo total de juego
- Intentos por nivel
- Smells corregidos por tipo (long method, magic numbers, etc.)
- Pistas usadas (cuántas veces se pidió ayuda a Cody)
- Estrellas obtenidas (total y por nivel)
- Gráfica simple de progresión de estabilidad por nivel

### Mejoras UI (menú principal)

- [x] Toggle de fuentes (VT323, Pixelify Sans, JetBrains Mono)
- [ ] Decidir fuente definitiva y limpiar toggle
- [ ] Mejorar visualmente Level Select (tarjetas más informativas)
- [ ] Posible animación sutil de fondo

---

## Visión a futuro: Fase 2 — Plataforma comunitaria (post-curso)

### Modelo de negocio/producto

Inspirado en **Geometry Dash** (NO en Tetr.io / tiempo real):
- Niveles asíncronos, no multiplayer en tiempo real
- REST API en lugar de WebSockets complejos
- Comunidad crea y comparte niveles
- Leaderboards por nivel
- Sistema de verificación (creador debe pasar su propio nivel antes de publicar)

### Stack propuesto

| Componente | Tecnología |
|-----------|-----------|
| Frontend | React 19 + TypeScript + Vite (ya existente) |
| Backend | **Go** (Golang) — cold starts rápidos en free tier |
| Base de datos | Neon.tech (PostgreSQL, 0.5GB, sin auto-pause) o Cloudflare D1 |
| Auth | JWT + OAuth (Google/GitHub) |
| Almacenamiento archivos | Cellar S3 o Cloudflare R2 |
| Deploy frontend | Vercel (gratis) |
| Deploy backend | Render / Koyeb (free tier, Go despierta en 1-3s) |
| Tests sandbox | Web Workers + Pyodite (Python en browser) |

### Arquitectura DB propuesta

Modelo híbrido: columnas indexadas (metadatos) + JSONB (payload):

```sql
levels:
  id UUID PRIMARY KEY
  title VARCHAR
  author_id UUID
  language VARCHAR  -- 'javascript', 'python'
  difficulty VARCHAR  -- 'Easy', 'Medium', 'Hard', 'Demon'
  primary_smell VARCHAR
  downloads INT DEFAULT 0
  likes INT DEFAULT 0
  level_data JSONB  -- initial_code, test_suite, ast_rules, hints
  verified BOOLEAN DEFAULT FALSE
  created_at TIMESTAMP
```

### Features planeadas (priorizadas)

1. **Niveles comunitarios** — creador de niveles en el frontend (Monaco editor)
2. **Verificación** — el creador debe resolver su propio nivel antes de publicar
3. **Leaderboards** — por nivel (tiempo, líneas, estabilidad)
4. **Perfiles de usuario** — stats, insignias, historial
5. **Rankings tipo Halo Reach** adaptados al contexto dev:

| Rango | Título | Requisito |
|-------|--------|-----------|
| Bronce | Code Cadet | Completar 3 niveles |
| Plata | Debugger | 10 niveles + 1 estrella promedio |
| Oro | Refactor Agent | 25 niveles + 2 estrellas promedio |
| Platino | Clean Architect | 50 niveles + 3 estrellas |
| Diamante | Legacy Slayer | 100 niveles + todos los demonds |
| Elite | Code Ghost | Top 1% leaderboard |
| Máximo | The Unal'd One | Creator destacado + todos los logros |

6. **Ghost mode** — ver el replay de otro jugador (movimientos, tiempos parciales)
7. **Importar repositorios GitHub/GitLab** — analizar AST y generar niveles automáticamente (stretch goal)
8. **Comodines estilo "¿Quién quiere ser millonario?"**:
   - 50:50 → Iluminar smell en el editor
   - Llamada a Cody → Pista detallada de IA
   - Público → Mapa de calor de cómo otros resolvieron

### Multi-lenguaje

- JavaScript (ya soportado)
- Python (via Pyodite en Web Worker)
- TypeScript (casi idéntico a JS, bajo demanda)
- Java/C++: no en roadmap corto (AST complejo, sandbox pesado)

### Infraestructura y costos

| Servicio | Plan | Costo |
|---------|------|-------|
| Vercel | Free (frontend estático) | $0 |
| Render / Koyeb | Free (Go backend, 512MB RAM) | $0 |
| Neon.tech | Free (PostgreSQL 0.5GB) | $0 |
| Cloudflare R2 | Free (10GB storage) | $0 |

**Total: $0/mes** para comunidad pequeña (< 2000 usuarios activos).
Si escala, migrar a planes Pro (~$25-50/mes).

---

## Decisiones arquitectónicas registradas

### Por qué Go y no Node.js para backend

- Cold start en free tier: Go 1-3s vs Node 8-15s
- Consumo RAM: Go ~15MB vs Node ~80-150MB
- Binario único, sin dependencias en producción
- Render/Koyeb gratuitos rinden más con Go

### Por qué NO Rust

- Curva de aprendizaje alta
- WebSockets con borrow checker = complejidad extra
- Overkill para < 10k usuarios
- Considerar solo si ya se domina Rust

### Por qué Geometry Dash y no Tetr.io

- Sin WebSockets en tiempo real (complejidad de red -80%)
- REST API suficiente para niveles asíncronos
- Contenido generado por la comunidad escala orgánicamente
- Verificación de niveles evita contenido roto

### Por qué Neon.tech sobre Supabase

- Supabase free: auto-pause a los 7 días sin actividad
- Neon.tech: sin auto-pause, mismo PostgreSQL, misma cantidad de almacenamiento
- Ninguna diferencia funcional relevante para el proyecto

---

## Enlaces útiles

- [Reporte final (docx)](docs/RefactorQuest_Reporte_Final_crinconro.md.docx)
- [Reporte final (PDF)](docs/RefactorQuest_Reporte_Final_crinconro.md.pdf)
- [Reporte final (MD)](docs/RefactorQuest_Reporte_Final_crinconro.md)
- [README del proyecto](README.md)
- [Conversación con Claude (PDF)](chat-1-claude.pdf)
- [Conversación con Gemini (TXT)](chat-2-gemini.txt)
- [Fuentes de letras consideradas](fuentes-de-letras.txt)

---

## Pendiente inmediato

- [ ] Decidir fuente definitiva para el título (VT323 vs Pixelify Sans vs JetBrains Mono)
- [ ] Implementar dashboard stealth assessment
- [ ] Corregir observaciones menores del reporte
- [ ] Validación experimental con compañeros (estudio formal)
