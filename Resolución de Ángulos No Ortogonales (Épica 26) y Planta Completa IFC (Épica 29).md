# Plan de Implementación — Resolución de Ángulos No Ortogonales (Épica 26) y Planta Completa IFC (Épica 29)

Este plan aborda la resolución matemática de encuentros a ángulos no ortogonales y la detección automática de uniones de planta completa al importar archivos IFC.

---

## 🔬 Propuesta Técnica

### 1. Extracción de Coordenadas 2D de Muros en `ifc-importer`
*   Para poder detectar uniones de forma espacial, cada muro IFC debe conocer su posición 2D en planta.
*   En `MuroIFC`, añadiremos las coordenadas `startX`, `startY`, `endX` y `endY`.
*   En `walls.ts`, calcularemos estas coordenadas a partir de los puntos extremos de la bounding box del elemento transformado, deduciendo si el muro corre preferentemente horizontal o vertical.

### 2. Detección Automática de Encuentros (Uniones de Planta Completa)
*   Crearemos `packages/ifc-importer/src/extractor/uniones.ts` con la función `detectarUniones(muros: MuroIFC[])`.
*   **Algoritmo**:
    *   Para cada par de muros, calculamos las distancias de extremo a extremo y de extremo a segmento.
    *   Si un extremo de un muro está a menos de `0.30m` de un extremo o del cuerpo del otro muro, detectamos una unión.
    *   Calculamos el ángulo relativo $\theta$ en grados sexagesimales (0–180°) usando el producto escalar de sus vectores directores.
    *   Clasificamos el tipo de unión:
        *   Si el extremo toca un extremo del otro muro: `L` (Esquina).
        *   Si el extremo toca el cuerpo del otro muro: `T` (Encuentro en T).
        *   Si el ángulo es cercano a 90° es ortogonal; si es diferente (ej. 45° o 60°), se calcula como no-ortogonal.

### 3. Nesting de Placas y Cortes a Inglete (Épica 26)
*   **Corte a Inglete de Perfiles**: El motor `core-engine/perfiles.ts` ya tiene soporte para compensar la longitud de rieles (`deltaAngulo = anchoPerfilM / Math.tan(alphaRad / 2)`). Aseguraremos su correcto funcionamiento en los casos de uniones y tests.
*   **Nesting de Placas**: Para encuentros a inglete, la placa que llega a la esquina debe cortarse en ángulo. El área neta de cobertura no varía significativamente para la dosificación, pero marcaremos las placas con una propiedad `anguloCorte` y añadiremos un factor de desperdicio adicional de placa de yeso si el ángulo es no ortogonal para compensar el corte diagonal.

---

## Proposed Changes

### [ifc-importer]

#### [MODIFY] [types.ts](file:///c:/Users/JF/Desktop/drywall/packages/ifc-importer/src/types.ts)
*   Añadir coordenadas `startX`, `startY`, `endX`, `endY` a `MuroIFC`.
*   Definir tipo `UnionIFC` detectado en el parseo.
*   Añadir `uniones: UnionIFC[]` al resultado `IfcImportResult`.

#### [MODIFY] [walls.ts](file:///c:/Users/JF/Desktop/drywall/packages/ifc-importer/src/extractor/walls.ts)
*   Obtener bounding box y poblar coordenadas `startX`, `startY`, `endX`, `endY` para cada muro.

#### [NEW] [uniones.ts](file:///c:/Users/JF/Desktop/drywall/packages/ifc-importer/src/extractor/uniones.ts)
*   Implementar `detectarUniones(muros: MuroIFC[]): UnionIFC[]`.

#### [MODIFY] [parser.ts](file:///c:/Users/JF/Desktop/drywall/packages/ifc-importer/src/parser.ts)
*   Llamar a `detectarUniones` y agregarlas al retorno del importador IFC.

---

### [core-engine]

#### [MODIFY] [proyecto.ts](file:///c:/Users/JF/Desktop/drywall/packages/core-engine/src/proyecto.ts)
*   Asegurar que el orquestador valide y procese uniones no ortogonales.

#### [MODIFY] [generarGrillaPlacas.ts](file:///c:/Users/JF/Desktop/drywall/packages/core-engine/src/nesting/generarGrillaPlacas.ts)
*   Si la unión tiene un ángulo distinto a 90°, marcar las placas en extremos con bandera de corte angular para que el instalador lo visualice.

#### [NEW] [diagnostico_caso_e.test.ts](file:///c:/Users/JF/Desktop/drywall/packages/core-engine/tests/diagnostico_caso_e.test.ts)
*   Escribir un test que verifique el cálculo de uniones a 45° y 60°, asegurando la exactitud de perfiles y placas estimadas.

---

### [web-app]

#### [MODIFY] [useProyecto.ts](file:///c:/Users/web-app/src/hooks/useProyecto.ts)
*   Modificar `importarDesdeIFC` para recibir tanto muros como uniones detectadas del IFC y poblar el proyecto completo.

---

### Pruebas Automatizadas
*   Correr `npm test` para asegurar que las uniones ortogonales y no ortogonales calculan perfiles y placas de forma exacta.

