# Visualizador BIM Robusto — Integración That Open Company

## Objetivo

Incorporar el ecosistema completo de **That Open Company** (ThatOpen) para transformar Drywall Calc de una calculadora de materiales a una **plataforma BIM integrada**: los usuarios podrán cargar archivos IFC, visualizar sus modelos en 3D con renderizado post-producción, medir ángulos y áreas directamente en el modelo, generar vistas 2D (planos, elevaciones y secciones), e importar los muros detectados automáticamente al motor de cálculo.

---

## 🔬 Análisis Detallado del Ecosistema ThatOpen & `web-ifc`

Tras una búsqueda minuciosa del repositorio de `engine_web-ifc` y la suite de componentes `@thatopen`, identificamos las siguientes capacidades clave que podemos explotar en nuestro proyecto:

### 1. Lectura, Edición y Escritura en Caliente (`engine_web-ifc` + `EditApi`)
*   **¿Qué ofrece?** A diferencia de visores 3D tradicionales que son de solo lectura, `web-ifc` (mediante su runtime compilado en WebAssembly) ofrece APIs para modificar y añadir entidades en memoria (`CreateIfcEntity()`, `UpdateIfcEntity()`) y serializar el resultado de vuelta a un archivo `.ifc` de texto plano con `SaveModel()`.
*   **Valor para Drywall Calc:** Podríamos permitir al usuario seleccionar un muro en el visualizador, elegir una tipología del catálogo de drywall (ej. Gyplac 1/2" con parantes de 89mm), asociarle esa información y **descargar un nuevo archivo IFC** enriquecido con Property Sets (`PSet_DrywallCalculations` o similar). Esto cierra el ciclo de diseño BIM de forma bidireccional.

### 2. Filtros y Árbol de Propiedades Dinámico (`Classifier` + `Hider` + `ItemsFinder`)
*   **¿Qué ofrece?**
    *   `Classifier` permite agrupar objetos usando cualquier propiedad del IFC de manera dinámica (ej. agrupar por clase IFC, por nivel/piso, por material o por sistema constructivo).
    *   `Hider` permite aislar o hacer invisibles grupos enteros con una sola instrucción.
    *   `ItemsFinder` proporciona un motor de consultas (queries declarativas) similar a SQL para buscar elementos.
*   **Valor para Drywall Calc:** Una barra lateral con el árbol del modelo clasificado por plantas/niveles, lo que le permite al usuario ocultar losas o cubiertas con un click para inspeccionar solo la tabiquería interna. Además, permite buscar instantáneamente "todos los muros de más de 3 metros de altura".

### 3. Vistas y Planos de Detalle CAD (`Views` + `EdgeProjector` + `TechnicalDrawings`)
*   **¿Qué ofrece?** 
    *   Proyección en 2D de las aristas del modelo 3D usando `EdgeProjector`.
    *   Generación de dibujos técnicos vectoriales (estilo CAD) representados como SVG o PDF planos usando `TechnicalDrawings`.
*   **Valor para Drywall Calc:** Podemos generar un **plano de despiece 2D** automático de la estructura del panel de drywall seleccionado (mostrando la modulación de parantes cada 40.7cm o 61cm, rieles superior/inferior, y esquemas de arriostramiento) y exportarlo a PDF para los instaladores en obra.

### 4. Grillas y Ejes Constructivos (`Grids`)
*   **¿Qué ofrece?** El componente `OBC.Grids` permite renderizar grillas estructuradas de ejes constructivos del IFC (ejes longitudinales y transversales como A, B, C, 1, 2, 3...) de manera persistente en 3D y proyectadas en 2D.
*   **Valor para Drywall Calc:** El operario en obra podrá orientarse mucho mejor al saber que un muro específico está ubicado "en la intersección del Eje B con el Eje 4".

### 5. Colaboración y Puntos de Vista (`BCFTopics` + `Viewpoints`)
*   **¿Qué ofrece?** Soporte completo para BCF (BIM Collaboration Format). Permite capturar la cámara, elementos seleccionados y notas de texto en un "punto de vista" (`Viewpoint`) portable.
*   **Valor para Drywall Calc:** El usuario puede marcar un muro y añadir un comentario (ej. "Revisar altura aquí, el ducto interfiere") y guardarlo en el archivo del proyecto para exportarlo como reporte BCF de incidencias.

---

## Arquitectura de la Integración

El visualizador BIM se construirá como un **nuevo paquete** `packages/bim-viewer` dentro del monorepo y se integrará en `web-app` como una pestaña/panel dedicado.

```
packages/
├── bim-viewer/           ← NUEVO — lógica de visualización y modelado BIM pura
│   ├── src/
│   │   ├── core/
│   │   │   ├── BimWorld.ts       — inicialización OBC.Components + escena + luces
│   │   │   ├── IfcPipeline.ts    — carga, caché de fragments y exportación .ifc
│   │   │   └── WallExtractor.ts  — extrae IfcWall → MuroIFC[] para el calculador
│   │   ├── tools/
│   │   │   ├── MeasureTools.ts   — mediciones 3D (ángulos, áreas, longitudes, volúmenes)
│   │   │   ├── ClipTools.ts      — Clipper 3D (planos de sección) + ClipStyler
│   │   │   ├── ViewsManager.ts   — vistas 2D (planos por nivel, elevaciones)
│   │   │   └── DrawingExporter.ts— exportador CAD 2D de modulación a SVG/PDF
│   │   └── index.ts
│   └── package.json
```

---

## Propuesta de Implementación por Fases (Expandida)

### Fase A — Infraestructura y Renderizado Base (MVP)
*   **Objetivo:** Un canvas 3D funcional con carga de archivos `.ifc` a alta velocidad y post-producción premium.
*   **Tareas:**
    1.  Crear y registrar el paquete `@drywall-calc/bim-viewer` en el monorepo.
    2.  Implementar `BimWorld.ts` inicializando components, camera (`OrthoPerspectiveCamera`), renderer (`PostproductionRenderer` con oclusión ambiental SSAO y contornos definidos) y luces optimizadas (`ShadowedScene`).
    3.  Implementar `IfcPipeline.ts` usando `IfcLoader` y sistema de Fragments 2.0 para procesar y cargar el modelo.
    4.  Crear componente React `BimViewer.tsx` con lazy-loading que monte y destruya el canvas correctamente liberando memoria.

### Fase B — Herramientas de Medición y Referencias Constructivas
*   **Objetivo:** Permitir medir ángulos, áreas y longitudes, y visualizar los ejes de grilla del proyecto.
*   **Tareas:**
    1.  Implementar herramientas en `MeasureTools.ts`:
        *   `AngleMeasurement` (3 puntos para verificar inclinaciones de techos/rampas).
        *   `LengthMeasurement` (para corroborar largos de perfiles).
        *   `AreaMeasurement` (polígono para m² de muros o cielorrasos).
    2.  Integrar `OBC.Grids` para cargar las grillas de ejes estructurales del IFC en 3D.
    3.  Añadir atajos de teclado configurables (`A` para ángulo, `L` para longitud, `Esc` para cancelar, `Delete` para borrar la medición seleccionada).

### Fase C — Vistas 2D y Generación de Planos de Despiece (CAD)
*   **Objetivo:** Generar planos 2D automatizados por piso y despieces vectoriales de perfiles de drywall.
*   **Tareas:**
    1.  Generar vistas de planta (`views.createFromIfcStoreys()`) y elevaciones automáticamente.
    2.  Implementar raycaster para secciones en caliente por doble click.
    3.  Integrar `EdgeProjector` y `TechnicalDrawings` para exportar a un archivo SVG/PDF la vista 2D del muro seleccionado con cotas de modulación (parantes a 0.407m / 0.61m).

### Fase D — Navegación del Modelo, Filtros y Propiedades
*   **Objetivo:** Facilitar la exploración del IFC usando un panel con árbol jerárquico y propiedades detalladas.
*   **Tareas:**
    1.  Configurar `Highlighter` (selección con outlines premium) y `Hoverer` (tooltips con metadatos rápidos).
    2.  Crear sidebar React con árbol de entidades agrupadas por nivel (usando `Classifier`).
    3.  Permitir ocultar clases IFC con un click (ej. ocultar `IfcSlab` e `IfcRoof` para ver muros).
    4.  Mostrar las propiedades IFC y permitir buscar elementos con queries de texto usando `ItemsFinder`.

### Fase E — Integración Bidireccional de Datos (Cálculo e IFC Writing)
*   **Objetivo:** Conectar el visualizador con el motor de cómputo drywall y permitir guardar los resultados de vuelta en el IFC.
*   **Tareas:**
    1.  Mapear muros seleccionados en el visor 3D al calculador (`importarDesdeIFC`).
    2.  **Edición y Exportación IFC:** Implementar en `IfcPipeline.ts` la lógica para modificar las propiedades del muro seleccionado (inyectándole el sistema constructivo asignado en Drywall Calc) y exportar el IFC modificado usando las APIs de escritura de `web-ifc`.
    3.  Visualización en el visor de etiquetas 3D (`Markers`) con los resultados clave de los materiales estimados (placas totales, parantes totales) para cada muro.

---

## Consideraciones Técnicas

> [!IMPORTANT]
> **Performance y Memoria:** El procesamiento de archivos IFC grandes en el cliente requiere liberar la memoria de Three.js y de los workers WASM al desmontar el visualizador. Nos aseguraremos de invocar `.dispose()` en todos los componentes de ThatOpen en el cleanup de React.

---

## Open Questions

> [!IMPORTANT]
> **¿Dónde colocamos el acceso al Visualizador 3D en la App?**
> *   **Opción A (Recomendada):** Una pestaña principal en la barra superior ("Calculadora 2D" y "Visor BIM 3D"). Esto le da el peso e importancia que merece la funcionalidad.
> *   **Opción B:** Un botón flotante "Ver en 3D" que abra el visualizador en un modal a pantalla completa.

---

## Plan de Verificación

*   **Verificación de Visualización:** Carga exitosa de modelos de prueba y activación de post-producción sin caídas de FPS.
*   **Verificación de Mediciones:** Las anotaciones de medición 3D deben persistir y calcular valores precisos al cambiar de perspectiva.
*   **Verificación de Exportación:** Abrir el IFC modificado en un visor externo (como BIM Vision o Solibri) y comprobar que los sets de propiedades drywall calculadas existen.

## Impacto en el Monorepo

| Archivo | Acción |
|---|---|
| `package.json` (root) | Agregar workspace `packages/bim-viewer` |
| `packages/bim-viewer/*` | **[NEW]** Todo el paquete nuevo |
| `packages/web-app/vite.config.ts` | Agregar optimización para `@thatopen/fragments` |
| `packages/web-app/src/App.tsx` | Agregar tab/panel del visor |
| `packages/web-app/src/components/viewer/*` | **[NEW]** Componentes React del visor |
