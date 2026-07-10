---
name: equipo-software-calculo-constructivo
description: Guía de referencia sobre los perfiles de desarrollador y especialistas necesarios para construir software de cálculo técnico constructivo con componente geométrico/CAD — por ejemplo calculadoras de materiales (drywall, tabiquería, cielorrasos), motores de cómputo métrico, plugins BIM/Revit/ArchiCAD, o herramientas de modulación 2D/3D. Usar esta skill cuando el usuario pregunte qué roles, especialidades o perfiles de desarrollador necesita para un proyecto de este tipo, esté armando un equipo, evaluando candidatos, planificando una contratación, o quiera entender qué partes del proyecto son un "foso competitivo" técnico y cuáles se pueden resolver con desarrollo genérico. Aplica también a software de cómputo métrico de otros rubros (electricidad, plomería, estructuras) que combinen geometría 2D/3D, catálogos de materiales configurables, y reglas de negocio técnicas del sector.
---

# Equipo para software de cálculo técnico constructivo

Este tipo de producto (calculadoras de materiales con componente geométrico — nesting, modulación, nodos/uniones, catálogos configurables) falla más seguido por **falta de un perfil correcto en el equipo** que por errores de código convencionales. Esta guía define los roles necesarios, en qué fase se necesitan, y cuáles son irremplazables.

## Cómo usar esta skill

1. Identificar en qué fase está el proyecto (ver documento de roadmap del usuario si existe: MVP, editor visual, IFC/BIM, etc.)
2. Mapear qué roles de la lista de abajo son necesarios para esa fase
3. Señalar explícitamente cuáles son los roles "no tercerizables" (sección final) — son los que más importa cubrir bien, incluso en equipos chicos
4. Si el usuario pide una ficha formal de equipo/contratación, generar una tabla con: rol, fase en que se necesita, dedicación (full-time/consultor), y criterios de evaluación de candidatos

## Roles críticos (sin esto, el producto falla)

### 1. Ingeniero de geometría computacional / algoritmos CAD
El núcleo técnico del proyecto: algoritmos de nesting/modulación, intersección de polígonos con aberturas, manejo de ángulos no ortogonales en uniones/nodos. Experiencia real requerida en:
- Clipping de polígonos (librerías tipo Clipper2, polygon-clipping)
- Estructuras de datos de geometría (half-edge, grafos planos, DCEL)
- Casos límite: ángulos agudos, aberturas que tocan bordes, tolerancias de punto flotante (errores de fracciones de milímetro mal manejados alteran conteos de materiales)

**No es reemplazable por un desarrollador web genérico.** Es la diferencia entre una calculadora aproximada y una que da resultados auditables.

### 2. Especialista en interoperabilidad BIM/IFC
Necesario cuando el roadmap llega a importación IFC o plugins de CAD (Revit, ArchiCAD), pero conviene tenerlo mapeado desde antes porque condiciona decisiones de arquitectura tempranas. Requiere conocer:
- El esquema IFC (`IfcWall`, `IfcWallStandardCase`, `IfcMaterialLayerSet`, `IfcOpeningElement`)
- Herramientas como `web-ifc` (TS/WASM) o `IfcOpenShell` (Python)
- Si hay plugin de Revit: la API de Revit es .NET/C# obligatorio, con su propio modelo (`WallType`, `CompoundStructure`)

### 3. Consultor técnico del rubro (el más subestimado)
No es programador — es alguien con experiencia real de obra o dominio profundo de los manuales técnicos del sector (ej. Pladur, Knauf, en drywall). Su función es validar que las reglas de negocio (separaciones, refuerzos, tipologías de unión, densidades de fijación) sean correctas en la práctica, no solo matemáticamente consistentes. Actúa como *product owner técnico de las fórmulas*. Sin este rol, el motor puede estar perfectamente programado y aun así calcular mal para uso real en obra.

## Roles importantes, más estándar

### 4. Frontend engineer especializado en editores interactivos tipo CAD
No un desarrollador de UI genérico — experiencia en canvas/SVG interactivo, snapping, grillas, manipulación de geometría en pantalla (familia de skills de herramientas tipo Figma/editores de planos). Necesario quando el proyecto suma un editor visual 2D/3D.

### 5. Arquitecto de software / backend orientado a "rules engines"
Diseño del catálogo configurable (datos vs. lógica separados), motor de reglas por tipología/fabricante, contratos de datos estables entre módulos. Más disciplina de diseño que tecnología específica — cualquier backend senior competente puede cubrirlo si entiende el patrón de separación catálogo/motor.

### 6. QA con enfoque en testing basado en casos de referencia
En este dominio un bug no es solo un error visual: puede significar que un cliente compró materiales de menos y se queda sin poder terminar la obra. Requiere:
- Casos de referencia contrastados contra calculadoras reales del mercado (ej. Pladur Calc, Knauf)
- Testing de propiedades/fuzzing para geometría (ángulos y dimensiones aleatorias para encontrar edge cases)
- No alcanza con tests unitarios de happy path

## Roles no tercerizables (foco si el equipo es chico o unipersonal)

De los seis roles, **#1 (geometría computacional)** y **#3 (consultor técnico del rubro)** son el verdadero foso competitivo del producto — no se resuelven con librerías genéricas ni con IA sin supervisión experta. El resto (frontend, backend, IFC) es ingeniería de software estándar aplicada al dominio, y se puede aprender sobre la marcha o contratar con generalistas senior.

**Recomendación para equipos de una persona:** enfocar el tiempo propio en dominar geometría computacional aplicada + el motor de reglas, y conseguir — aunque sea como consultor part-time — a alguien con experiencia real de obra en el rubro para validar cada fórmula antes de darla por buena. Ese segundo rol suele ser barato de conseguir (un instalador o calculista experimentado) y evita el error más caro: un algoritmo elegante que calcula mal en la práctica.

## Formato sugerido si se pide una ficha formal de equipo

| Rol | Fase en que se necesita | Dedicación sugerida | Señal de que un candidato es sólido |
|---|---|---|---|
| Geometría computacional | Desde el MVP (motor de nesting) | Full-time / co-founder técnico | Puede explicar clipping de polígonos y manejo de tolerancias sin buscarlo, portfolio con geometría 2D/3D real |
| Consultor técnico del rubro | Desde el MVP (validación de fórmulas) | Consultor part-time | Experiencia de obra o certificación de fabricante, cuestiona fórmulas en vez de solo aprobarlas |
| BIM/IFC | Fase de integración BIM | Consultor o contratación puntual | Ha trabajado con IfcOpenShell/web-ifc o plugins Revit reales, no solo teoría del estándar |
| Frontend CAD-like | Fase de editor visual | Full-time o freelance senior | Portfolio con canvas/SVG interactivo, no solo apps CRUD |
| Arquitecto backend/rules engine | Desde el MVP | Full-time o el mismo líder técnico | Diseña separación datos/lógica sin que se lo pidan explícitamente |
| QA geometría/casos de referencia | Desde el MVP, se intensifica con cada fase | Part-time creciente | Piensa en edge cases geométricos, no solo en flujos de UI |
