**Refactor Quest**

*Reporte final — Curso ABJ-d*

*Estudiante: César Fabián Rincón Robayo | crinconro@unal.edu.co*

*Curso ABJ-d | Universidad Nacional de Colombia, sede Bogotá*

#

# **Palabras clave**

Juegos serios, refactorización de código, code smells, aprendizaje basado en juegos, evaluación invisible.

# **Keywords**

Serious games, code refactoring, code smells, game-based learning, stealth assessment.

# **Resumen**

En las últimas décadas, la industria del desarrollo de software enfrenta un problema latente: el código no refactorizado y alejado de los estándares de código limpio. Como resultado, el mantenimiento tiende a ser más difícil y, en muchos casos, más costoso que el propio desarrollo. Para mitigar esta tendencia en la formación de futuros programadores, este trabajo presenta **RefactorQuest**, un juego serio centrado en la refactorización de código, donde los jugadores trabajan con código real y progresión gradual para desarrollar una competencia que les servirá en su ejercicio profesional. El reporte construye sobre el estado del arte identificado en la Fase 1, detalla el diseño del juego bajo el marco LM↔SGM↔GM (Arnab et al., 2015), describe la implementación del prototipo y sus instrucciones de uso, y cierra con conclusiones y declaración de uso de IA.

#

# **1. Introducción**

Actualmente en la industria del desarrollo de software se estima que la mayoría del esfuerzo y los recursos invertidos se destinan al mantenimiento y corrección de errores de sistemas existentes, no a construir cosas nuevas desde cero. Es algo tan importante que debería estar presente desde el principio en la formación de cualquier desarrollador, pero en la práctica no suele ser así. En el aula se prioriza que el código funcione, y si funciona, no se toca, por el miedo a que al modificarlo se rompa algo más. Ese ciclo genera profesionales que saben escribir código, pero que se paralizan cuando reciben un proyecto heredado lleno de deuda técnica.

## **1.1. Estado del arte**

Para construir una propuesta sólida se revisaron tres líneas de evidencia: una revisión de alcance sobre aprendizaje basado en juegos (GBL) en educación informática, una revisión sistemática sobre intervenciones para enseñar debugging, y una revisión sobre code smells y refactorización.

Videnovik et al. (2023) publicaron una revisión de alcance en el *International Journal of STEM Education* (Q1) analizando 113 artículos sobre juegos en educación informática. Sus hallazgos muestran que la mayoría se concentran en pensamiento computacional y sintaxis básica, y los autores identifican explícitamente que temas como la calidad del software, las pruebas y el mantenimiento tienen una presencia mínima en el corpus revisado. Ese es exactamente el espacio donde se posiciona RefactorQuest.

DeLiema et al. (2024) publicaron una revisión sistemática de intervenciones para enseñar debugging en *ACM Transactions on Computing Education* (Q1). Un hallazgo clave es que la mayoría de las intervenciones se enfocan en los aspectos cognitivos del debugging, pero muy pocas abordan las dimensiones no cognitivas: la autoeficacia, la persistencia y la tolerancia a la frustración. Los autores señalan que los estudiantes que enfrentan errores complejos sin una rutina estructurada tienden a perder confianza en sus capacidades. Esta observación justifica la decisión de envolver el ejercicio técnico dentro de una narrativa de rol: el jugador no es un estudiante que falla, es un experto resolviendo un caso.

Reis et al. (2021) muestran en *Information and Software Technology* (Q1) que la detección de code smells es un área activa con bastantes herramientas disponibles, pero casi todo ese esfuerzo apunta a profesionales, no a estudiantes. Ouni et al. (2017), también en *Information and Software Technology* (Q2), van un paso más allá: no solo detectan qué está mal sino que ayudan a priorizar qué corregir primero. Esa lógica de tomar decisiones con recursos limitados es exactamente la mecánica central de RefactorQuest.

## **1.2. Definición del problema**

La convergencia de las tres revisiones define el problema de forma precisa: no existe un juego digital que enseñe diagnóstico y refactorización de código a estudiantes universitarios, usando código con deuda técnicas real, que integre la lógica de priorización de code smells dentro de una experiencia narrativa que apoye también la autoeficacia y la resiliencia del estudiante.

La hipótesis de investigación propuesta es:

> Un juego digital con mecánicas de diagnóstico y refactorización, apoyado en una narrativa de rol que simula la priorización de tareas en un proyecto real, desarrollará competencias de análisis de calidad de software y fortalecerá la autoeficacia del estudiante de manera más efectiva que los ejercicios tradicionales de refactorización aislada.

Los principios de diseño que guían el juego son: código real como material de trabajo, no fragmentos artificiales; narrativa que transforma el error en un desafío del personaje, no en un fracaso del estudiante; mecánicas que exijan decisiones de nivel Analizar y Evaluar según la taxonomía de Bloom; y retroalimentación inmediata tras cada intervención.

#

# **2. Enfoque: diseño del juego serio**

El diseño pedagógico de RefactorQuest sigue el framework de Arnab et al. (2015), que propone analizar los juegos serios a través del vínculo entre Learning Mechanics (LM) y Game Mechanics (GM), articulado por un puente llamado Serious Game Mechanic (SGM). La siguiente tabla formaliza ese vínculo para cada mecánica del juego.

**Tabla 1. Mapeo LM ↔ SGM ↔ GM de RefactorQuest**

| Learning Mechanic | Nivel Bloom | Serious Game Mechanic (SGM) | Game Mechanic | Decisión de diseño |
|---|---|---|---|---|
| **Observation** | Analyze | Diagnosticar código como "ingeniero forense" | Feedback, Realism | Editor Monaco con resaltado amarillo sobre las líneas con smells; avatar Cody señala líneas clave con rectángulos de foco. |
| **Identify** | Understand | Reconocimiento visual asistido por el sistema | Selecting / Collecting | Los smells vienen pre-detectados por validadores y resaltados en el editor; el jugador los reconoce visualmente antes de refactorizar. En un juego introductorio se privilegia el foco en la acción de refactorizar sobre la detección manual. |
| **Hypothesis** | Evaluate | Priorizar qué refactorizar primero con recursos limitados | Resource Management | Sistema de energía que se consume al resolver cada smell (ponderada por severidad); el jugador decide qué atacar primero. |
| **Action / Task** | Apply | Escribir/editar código real para eliminar el smell | Design / Editing | Monaco Editor: edición libre con sintaxis real, IntelliSense y tema One Dark Pro. |
| **Feedback** | (transversal) | Ejecutar tests para verificar la corrección | Levels, Progression | Botón "Ejecutar tests": pasan = avanzas, fallan = reintentas sin penalización. |
| **Motivation** | (afectivo) | Narrativa de "sistema en crisis", rol de especialista | Rewards / Status | Puntuación, estrellas de calificación, barra de Estabilidad del Sistema, avatar Cody como guía. |
| **Planning** | Create | Decidir estrategia global de refactorización | Strategy / Pareto Optimal | En niveles con múltiples smells que interactúan, el orden de refactorización afecta la estabilidad ponderada. |

## **2.1. El SGM como eje del diseño**

La Tabla 1 muestra que todas las mecánicas de aprendizaje convergen en un único SGM: modificar código real para restaurar la estabilidad del sistema. En lugar de distribuir el aprendizaje entre mecánicas heterogéneas (una actividad para identificar smells, otra para refactorizar, otra para testear), RefactorQuest concentra todo en la misma acción: editar el código del sistema. Observar, diagnosticar, priorizar, aplicar, verificar — todo ocurre en el mismo espacio, con el mismo artefacto. Eso es lo que hace que el juego sea un juego y no una lista de ejercicios disfrazada.

## **2.2. Core Loop**

El core loop que emerge del mapeo es:

> *Observar código → Diagnosticar smells → Refactorizar (editar) → Ejecutar tests → Feedback → (repetir)*

El jugador pasa el 80% del tiempo en los pasos de Observar, Diagnosticar y Editar. El Feedback cierra el ciclo y da la señal para reiniciar. Si el jugador se atasca, el avatar Cody ofrece sugerencias contextuales como *scaffolding* — sin ejecutar la refactorización en su lugar. El jugador siempre escribe el código.

## **2.3. Stealth Assessment: evaluación invisible**

La Tabla 1 asigna un nivel de la taxonomía de Bloom a cada mecánica, pero esa asignación sería solo declarativa si el juego no pudiera observar si esos niveles cognitivos se ejercitan. RefactorQuest incorpora stealth assessment (Lu et al., 2025; Banihashem et al., 2023): el sistema registra telemetría del comportamiento del jugador sin presentarla como evaluación explícita.

**Tabla 2. Métricas de stealth assessment**

| Métrica registrada | Qué mide | Nivel Bloom |
|---|---|---|
| Orden de detección de smells | Capacidad de priorización | Evaluate |
| Tiempo hasta identificar cada smell | Fluidez diagnóstica | Analyze |
| Número de intentos de refactorización | Persistencia y tolerancia a la frustración | (afectivo) |
| Uso de sugerencias del avatar | Autonomía del estudiante | (afectivo) |
| Tests pasados al primer intento | Precisión técnica | Apply |

Esta telemetría no se muestra al jugador durante la partida: hacerlo convertiría el juego en un examen permanente. Su uso previsto es alimentar, de forma opcional, un dashboard para el docente.

## **2.4. EDTF: diseño empático**

El Empathic Design Thinking Framework (Maxim, 2025) propone que los juegos educativos efectivos deben diseñarse desde tres dimensiones empáticas simultáneas.

**Tabla 3. Principios EDTF en RefactorQuest**

| Principio EDTF | Aplicación |
|---|---|
| **Empatía cognitiva** — no saturar la memoria de trabajo | Panel izquierdo ligero (~30%), sin popups modales, una sugerencia a la vez. |
| **Empatía afectiva** — el error no es castigo | Tests fallidos muestran "Intenta otra estrategia" en vez de penalizar. Sin GAME OVER definitivo. La narrativa dice "el sistema está en crisis", no "eres malo programando". |
| **Empatía física** — no cansar vista ni manos | Tema One Dark Pro (contraste suave), JetBrains Mono 15px, sin animaciones intrusivas, editor familiar (Monaco = VS Code). |

## **2.5. Justificación de la herramienta**

El proceso de diseño evaluó Twine y GDevelop antes de elegir el stack. El principio fue: *elige la herramienta cuya primitiva coincida con tu bucle principal*. El core loop de RefactorQuest requiere editar texto estructurado con validación automática. Esa primitiva no existe en Twine (narrativas ramificadas, sin edición de código) ni en GDevelop (acción en tiempo real, separada del aprendizaje). Existe en Monaco Editor.

El código que el jugador refactoriza es JavaScript: nativo en navegador, ejecución de tests instantánea vía Web Worker, IntelliSense real en Monaco. Los code smells seleccionados (Long Method, Magic Numbers, Duplicate Code) son universales — existen y son igual de legibles en cualquier lenguaje orientado a objetos.

**Tabla 4. Stack tecnológico**

| Componente | Tecnología | Justificación |
|---|---|---|
| Lenguaje del juego | JavaScript (ES6+) | Nativo en navegador, IntelliSense real |
| Frontend | React 19 + TypeScript | Web app, ecosistema amplio |
| Editor | Monaco Editor | El mismo de VS Code |
| Tema | One Dark Pro | Contraste suave, sin fatiga visual |
| Build | Vite 8 | Rápido, compatible con Monaco |
| Tests | Web Worker | Ejecución en sandbox del lado del cliente |

## **2.6. Diseño de la interfaz**

La interfaz sigue una arquitectura de dos paneles inspirada en el IDE profesional. El panel izquierdo (~30%) contiene la misión, los smells detectados con su severidad, la barra de estabilidad y la energía disponible. El panel derecho (~70%) es el editor Monaco donde ocurre el aprendizaje. La decisión de dar el 70% al editor viene directamente del mapping LM-GM: si Action/Task es la mecánica central, la interfaz privilegia ese espacio.

![Pantalla principal de RefactorQuest durante la fase de diagnóstico.](refactorquest_wireframe.png)

*Figura 1. Pantalla principal de RefactorQuest durante la fase de diagnóstico.*

La pantalla de resultado muestra el veredicto inmediatamente visible —un banner en verde o rojo— porque esa es la pregunta que el jugador tiene en la cabeza después de ejecutar los tests. El panel izquierdo muestra los smells con su estado final (corregidos en verde, omitidos en gris), lo que obliga al jugador a reflexionar sobre sus decisiones de priorización.

![Pantalla de resultado de nivel.](refactorquest_level_complete.png)

*Figura 2. Pantalla de resultado de nivel con calificación por estrellas.*

#

# **3. Uso**

## **3.1. Repositorio**

El código fuente está disponible en:

**`https://github.com/CesarFRR/refactor-quest`**

## **3.2. Requisitos**

- Node.js 18+ y npm
- Navegador moderno (Chrome, Firefox, Edge)

## **3.3. Ejecución local**

```bash
git clone https://github.com/CesarFRR/refactor-quest.git
cd refactor-quest
npm install
npm run dev
```

El juego se abre en `http://localhost:5173`.

## **3.4. Build de producción**

```bash
npm run build
npm run preview
```

## **3.5. Despliegue**

El prototipo está desplegado en:

**`https://cesarfrr.github.io/refactor-quest/`**

Los revisores pueden acceder directamente sin clonar el repo.

#

# **4. Conclusiones**

Se desarrolló un juego que logra su cometido de enseñar a refactorizar por medio de un juego serio. Sin embargo, no abarca todos los tipos de malas prácticas de código o smells que puedan existir en la industria, por lo que es un juego introductorio a la refactorización. Se asume la responsabilidad del uso de la IA en el desarrollo y se concluye que este tipo de juegos requiere no solo pensar en las mecánicas y el código, sino en el jugador y en cómo hacer que todo tipo de público, tanto principiante como avanzado, aprenda a su ritmo. Como trabajo futuro se planean mecánicas de competencias online, rankings y similares para motivar a los jugadores a mejorar.

#

# **5. Declaración de uso de IA**

Se realizó uso de IA (Claude, Gemini) en la codificación del juego, específicamente en el apartado del diseño, interfaz, animaciones e interacción con el personaje Cody. La idea de diseño, lógica de negocio, reglas, diseño lógico de niveles y demás fue por parte del autor. Se usó IA en la documentación en el aspecto de crear tablas que estructuren y simplifiquen la información para mejor lectura. Se asume la responsabilidad del uso de estas herramientas.

#

# **6. Referencias**

Anderson, L. W., & Krathwohl, D. R. (2001). *A Taxonomy for Learning, Teaching, and Assessing*. Longman.

Arnab, S., Lim, T., Carvalho, M. B., Bellotti, F., de Freitas, S., Louchart, S., Suttie, N., Berta, R., & De Gloria, A. (2015). Mapping learning and game mechanics for serious games analysis. *British Journal of Educational Technology*, 46(2), 391-411. https://doi.org/10.1111/bjet.12113

Banihashem, S. K., Dehghanzadeh, H., Clark, D., Noroozi, O., & Biemans, H. J. A. (2023). Learning analytics for online game-based learning: A systematic literature review. *Behaviour & Information Technology*, 42, 2689–2716. https://doi.org/10.1080/0144929X.2023.2255301

Bellotti, F., Berta, R., De Gloria, A., & Primavera, L. (2009). Enhancing the educational value of video games. *ACM Computers in Entertainment*, 7(2), Article 23.

Bloom, B. S. (1956). *Taxonomy of Educational Objectives, Handbook I: Cognitive Domain*. David McKay.

DeLiema, D., Bye, J. K., & Marupudi, V. (2024). Debugging pathways: Open-ended discrepancy noticing, causal reasoning, and intervening. *ACM Transactions on Computing Education*, 24(2), 1-34. https://doi.org/10.1145/3650115

Lu, W., Griffin, J., Sadler, T. D., Laffey, J., & Goggins, S. P. (2025). Game-based learning prediction model construction: Towards validated stealth assessment implementation. *Journal of Learning Analytics*, 12(1), 293–321. https://doi.org/10.18608/jla.2025.8105

Martin, R. C. (2008). *Clean Code: A Handbook of Agile Software Craftsmanship*. Prentice Hall.

Maxim, R. I. (2025). EDTF: A user-centered approach to digital educational games design and development. *Information*, 16(9), 794. https://doi.org/10.3390/info16090794

Melcer, E. F., et al. (2020). Getting Academical: A Choice-Based Interactive Storytelling Game for Teaching Responsible Conduct of Research. *FDG 2020* (ACM). Exceptional Paper Award.

Ouni, A., Kessentini, M., Cinnéide, M. Ó., Sahraoui, H., Deb, K., & Inoue, K. (2017). MORE: A multi-objective refactoring recommendation approach to introducing design patterns and fixing code smells. *Journal of Software Evolution and Process*, 29(5), e1843. https://doi.org/10.1002/smr.1843

Reis, J. P. D., Abreu, F. B. E., De Figueiredo Carneiro, G., & Anslow, C. (2021). Code smells detection and visualization: A systematic literature review. *Archives of Computational Methods in Engineering*, 29(1), 47-94. https://doi.org/10.1007/s11831-021-09566-x

Sicart, M. (2008). Defining Game Mechanics. *Game Studies*, 8(2).

Silva-Vásquez, P. O., et al. (2023). Model for Semi-Automatic Serious Games Generation. *Applied Sciences*, 13(8), 5158. https://doi.org/10.3390/app13085158

Videnovik, M., Vold, T., Kiønig, L., Madevska Bogdanova, A., & Trajkovik, V. (2023). Game-based learning in computer science education: A scoping literature review. *International Journal of STEM Education*, 10(1), 54. https://doi.org/10.1186/s40594-023-00447-2
