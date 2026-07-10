# 📋 Roadmap Completo — Drywall Calc (Fases 1 a 5)

> Basado estrictamente en los documentos de diseño del proyecto: `backlog-fase1.md`, `arquitectura-implementacion-contratos.md`, `diseno-motor-nesting-catalogo-generico.md` y `equipo-software-calculo-constructivo.md`.

---

## 🟢 FASE 1 — MVP Motor de Cálculo (COMPLETADA)

> **Objetivo**: Motor de cálculo puro en TypeScript, sin UI, que pase los 4 Casos de Oro.

### Épica 0 — Setup del Repositorio
- [x] **0.1** Inicializar monorepo npm workspaces con `core-engine` y `catalog-schemas` + `tsconfig.base.json` en modo `strict`
- [x] **0.2** Configurar ESLint + Prettier
- [x] **0.3** Configurar Vitest en `packages/core-engine`
- [x] **0.4** CI en GitHub Actions: lint + test en cada PR

### Épica 1 — Catálogo y Tipos de Dominio
- [x] **1.1** Definir `types.ts` con los tipos maestros del dominio (`Muro`, `Union`, `Catalogo`, `ResultadoMuro`, etc.)
- [x] **1.2** Definir schema Zod del catálogo (`catalogoSchema.ts`)
- [x] **1.3** Escribir `generico_estandar.json` con valores del catálogo base (perfiles, placas, tornillos, tipologías de unión)
- [x] **1.4** Implementar `loader.ts` (carga y valida el catálogo)

### Épica 2 — Utilidades Geométricas Base
- [x] **2.1** Implementar `redondeo.ts` (`EPS`, `roundUpSafe`, `roundDownSafe`, `roundFloat`, `iguales`)
- [x] **2.2** Implementar `geometria.ts` (intersección de rectángulos, área, "contiene completamente")

### Épica 3 — Nesting paso 1: Grilla base de placas
- [x] **3.1** `generarGrillaPlacas` orientación vertical, origen fijo
- [x] **3.2** `generarGrillaPlacas` orientación horizontal con desfase alternado por hilada (aparejo)
- [x] **3.3** Soporte de `origen: { x0_m, simetrico }` configurable

### Épica 4 — Nesting paso 2: Recorte por aberturas
- [x] **4.1** Recorte de placas que intersectan parcialmente una abertura (`recortada: true`)
- [x] **4.2** Descarte de placas cubiertas 100% por una abertura
- [x] **4.3** Soporte de múltiples aberturas sin superposición

### Épica 5 — Nesting paso 3: Extracción de juntas
- [x] **5.1** Extracción de juntas verticales y horizontales entre placas adyacentes
- [x] **5.2** Recorte de segmentos de junta que caen dentro de una abertura
- [x] **5.3** Desfase de juntas entre capas (`desfase_junta_vertical_min_m`)

### Épica 6 — Cálculo de Perfiles (montantes y rieles)
- [x] **6.1** Fórmula base de montantes y riel sin vanos ni uniones
- [x] **6.2** Regla de jambas dobles en vanos + riel de piso interrumpido
- [x] **6.3** Regla de perfil adicional por unión (esquina/T) sin duplicar

### Épica 7 — Tornillería, cinta/masilla, aislante, esquineros
- [x] **7.1** `calcularTornilleria` (placa-perfil, perfil-perfil, anclajes a losa)
- [x] **7.2** `calcularCintaMasilla` a partir de `SegmentoJunta[]`
- [x] **7.3** `calcularAislante` (área neta → paquetes)
- [x] **7.4** `calcularEsquineros` (ml de esquinero metálico por unión)

### Épica 8 — Orquestador y validación de entrada
- [x] **8.1** Validación de geometría y aberturas con Zod (dimensiones positivas, sin superposición)
- [x] **8.2** `calcularMuro()` orquestador completo: los 4 Casos de Oro pasan ✅
- [x] **8.3** Array `trazabilidad` con explicación textual auditada de cada número

### Épica 9 — Hardening con testing de propiedades
- [x] **9.1** Property test: área de placas nunca < área neta del muro (100 iteraciones aleatorias)
- [x] **9.2** Property test: cantidades de materiales siempre entero ≥ 0
- [x] **9.3** Property test: juntas con abertura aleatoria nunca produce ML negativo

### 🎯 Hito: Subida a GitHub
- [x] Repositorio publicado en https://github.com/vladicards11/drywall.git

---

## 🔵 FASE 2 — Proyecto Completo (Motor Maduro)

> **Objetivo**: Múltiples muros/ambientes, motor de reglas de casuística completo (estructura doble, zonas húmedas/RF, muros altos con empalme) y exportación.
>
> **Punto de partida verificado en el repo** (no supuesto — confirmado leyendo el código actual):
> - `ProyectoSchema` y `UnionSchema` **ya existen** — la validación Zod de esta fase está adelantada
> - **No existe `calcularProyecto`** — el Caso C de Fase 1 consolida 2 muros manualmente en el test
> - `sistema.estructura: "simple" | "doble"` existe en el tipo `Muro` pero **`calcularPerfiles` lo ignora**
> - `calcularPerfiles` y `calcularEsquineros` ya soportan uniones con N muros — falta el caso de oro que lo confirme
> - No hay soporte para empalme de montante en muros altos
> - No hay agrupador `Ambientes`, ni exportación a Excel/PDF
>
> **Prerrequisito de Fase 1**: Aplicar `fix-build-ci-lint.patch` antes de tocar código de esta fase ✅ (ya aplicado)

### Épica 10 — Orquestador de Proyecto (`calcularProyecto`) ← BLOQUEA TODO
- [x] **10.1** Validación de integridad referencial: cada `union.muros_conectados` debe apuntar a `id` de muros existentes en el proyecto; un muro que no existe lanza `ProyectoInvalidoError` tipado, nunca un `undefined` silencioso
- [x] **10.2** Implementar `calcularProyecto(proyecto, catalogo): ResultadoProyecto` que llama a `calcularMuro` por cada muro y consolida cinta/masilla/aislante a nivel proyecto (idéntico al cálculo que hoy está a mano en el test del Caso C)
- [x] **10.3** Reemplazar la suma manual del test Caso C en `orquestador.test.ts` por una llamada real a `calcularProyecto` — eliminar los dos caminos de cálculo paralelos

> 🎯 **Checkpoint**: El Caso C deja de ser un caso especial sumado a mano y pasa a ser un proyecto real de 2 muros procesado por el orquestador.

### Épica 11 — Uniones extendidas (T, cruces, más de 2 muros)
- [x] **11.1** Agregar tipología de unión "T" al catálogo genérico (`n_muros_soportados: 3`) — validar sin errores de schema
- [x] **11.2** Calcular y documentar **Caso F: unión en T** (3 muros en un nodo) en `casos-de-oro-referencia.md` con valores calculados a mano y trazabilidad completa
- [x] **11.3** Ejecutar Caso F contra `calcularProyecto` y corregir si aparece algún caso no contemplado (ej. reparto de perfiles adicionales entre 3 muros vs. asignarlos todos al primero alfabético)
- [x] **11.4** Soporte de ángulo no ortogonal en una unión (ej. 60°): corte a inglete en la longitud de perfil consumida en el nodo. Test unitario: unión a 60° consume más longitud de perfil en el nodo que una a 90°

### Épica 12 — Casuística: estructura doble
- [x] **12.1** En `calcularPerfiles`: si `sistema.estructura === "doble"`, duplicar la línea de montantes y riel (dos líneas independientes de estructura). Test: mismo muro simple vs. doble → montantes y rieles exactamente ×2
- [x] **12.2** En `calcularAislante`: con estructura doble el área neta se aísla una sola vez, pero el catálogo debe permitir un espesor distinto por línea si corresponde. Test unitario específico.
- [x] **12.3** Documentar y agregar **Caso G: estructura doble** a `casos-de-oro-referencia.md` con test de regresión en verde

### Épica 13 — Casuística: zonas húmedas (placa RH) y resistencia al fuego (placa RF)
- [x] **13.1** Agregar entradas `RH` y `RF` al catálogo genérico (`generico_estandar.json`) con su `espesor_mm` y `peso_kg_m2` propios — el catálogo valida sin errores
- [x] **13.2** Test explícito con placa RF (15mm): verificar que `calcularTornilleria` usa la densidad de tornillos del espesor real (`placa_perfil_por_m2["15mm"]`), distinta a la de 12.5mm
- [x] **13.3** Agregar `placas.peso_total_kg` al `ResultadoMuro` (área instalada × `peso_kg_m2` de la placa seleccionada) — dato relevante para flete y carga estructural

### Épica 14 — Casuística: muros altos con empalme de montante
- [x] **14.1** En `calcularPerfiles`: si `alto_m` supera `largo_barra_m` del perfil de montante, calcular el empalme (montante adicional de refuerzo). Test: muro de 3.20m con barra de 3.00m requiere empalme; muro de 2.80m no.
- [x] **14.2** Documentar y agregar **Caso H: muro alto con empalme** a `casos-de-oro-referencia.md` con test de regresión en verde

### Épica 15 — Modelo de Ambientes (agrupador)
- [x] **15.1** Extender `ProyectoSchema` / `Proyecto` con `ambientes: Ambiente[]` opcional, donde cada ambiente agrupa un subconjunto de `muro_id`. Campo retrocompatible: proyectos existentes siguen validando sin cambios.
- [x] **15.2** `calcularProyecto` agrega un desglose de resultados por ambiente además del total del proyecto. `ResultadoProyecto.por_ambiente` existe y suma exactamente al total general.

### Épica 16 — Exportación a Excel/PDF
- [x] **16.1** Spike de decisión de librería: evaluar `exceljs` para Excel y `pdf-lib` o HTML→PDF para el informe. Documentar elección y justificación (0.5d, no implementación)
- [x] **16.2** Exportador de `ResultadoProyecto` a Excel: hoja de resumen de materiales + hoja de detalle por muro. El archivo generado abre sin errores en Excel/LibreOffice y los totales coinciden con el resultado de origen.
- [x] **16.3** Exportador a PDF con el mismo contenido formateado como presupuesto/lista de materiales. Las cifras del PDF coinciden exactamente con el Excel, sin discrepancias.

> **Dependencias de Fase 2:**
> ```
> Épica 10 ← bloquea todo lo demás
>    ├─▶ Épica 11 (uniones T/ángulos)
>    ├─▶ Épica 12 (estructura doble)
>    ├─▶ Épica 13 (zonas húmedas/RF)
>    ├─▶ Épica 14 (empalme de montante)
>    ├─▶ Épica 15 (ambientes)
>    └─▶ Épica 16 (exportación) ← conviene última, depende de ResultadoProyecto estabilizado
> ```
> Las Épicas 11–15 son **independientes entre sí** una vez cerrada la 10 — se pueden paralelizar.
>
> ⚠️ Las Épicas 12 y 14 requieren revisión del **consultor técnico del rubro** — son las que más dependen de práctica real de obra y se apartan de fórmulas de libro.
>
> **Estimación**: ~24-26 días-persona, sin contar la validación del consultor técnico.

---

## 🟠 FASE 3 — Web App (Interface Visual)

> **Objetivo**: Aplicación web que permita ingresar un muro, ver la grilla de placas en pantalla y obtener el listado de materiales.

### Épica 15 — Setup `web-app` con framework
- [x] **15.1** Crear `packages/web-app` con Next.js o Vite + React + TypeScript
- [x] **15.2** Configurar integración con `@drywall-calc/core-engine` como dependencia local del workspace
- [x] **15.3** Definir design system: paleta, tipografía, tokens de espacio
- [x] **15.4** Layout base: sidebar de configuración + panel de visualización principal

### Épica 16 — Formulario de entrada de muro
- [x] **16.1** Campos para geometría del muro (largo, alto)
- [x] **16.2** Selector de sistema constructivo (perfil, separación de montantes, caras, capas)
- [x] **16.3** Selector de placa (tipo, espesor, formato, orientación) con las opciones del catálogo activo
- [x] **16.4** Formulario para agregar/editar/eliminar aberturas (tipo, ancho, alto, posición desde inicio)
- [x] **16.5** Validaciones en tiempo real: mostrar errores Zod inline en el formulario
- [x] **16.6** Botón "Calcular" que invoca `calcularMuro()` del motor

### Épica 17 — Visualizador 2D de la grilla de placas
- [x] **17.1** Canvas/SVG que renderiza la grilla de placas del muro usando las coordenadas `(x, y, ancho, alto)` del `ResultadoMuro.placas.detalle`
- [x] **17.2** Colorear diferente: placa completa vs. placa recortada (`recortada: true`)
- [x] **17.3** Dibujar el área de las aberturas (vanos de puerta/ventana) en el canvas
- [x] **17.4** Toggle entre "Cara A" y "Cara B" para muros de dos caras
- [x] **17.5** Toggle entre capas (para muros con `capas_por_cara > 1`)
- [x] **17.6** Mostrar juntas sobre el canvas (líneas diferenciadas entre placas)
- [x] **17.7** Zoom y paneo básico en el canvas

### Épica 18 — Panel de resultados de materiales ✅ 100%
- [x] **18.1** Tabla de resumen de materiales estructurada por grupos (Placas, Estructura, Fijaciones, Acabados, Aislación) con desglose de cantidad, unidad, detalle técnico y peso estructural
- [x] **18.2** Sección de trazabilidad desplegable (card de Peso Estructural Estimado con desglose de masa)
- [x] **18.3** Botón de exportar a PDF via `window.print()` con estilos `@media print` optimizados A4 (sin dependencias externas)
- [x] **18.4** Botón de exportar a CSV con codificación UTF-8 BOM, descargable en cliente sin servidor
- [x] **18.5** Compartir cálculo via URL — estado completo del formulario serializado en `URLSearchParams`, con auto-carga y auto-cálculo al montar

### Épica 19 — Proyecto multi-muro ✅ 100%
- [x] **19.1** Capacidad de definir un proyecto con múltiples muros (MurosList.tsx y hook reactivo useProyecto)
- [x] **19.2** Definición de uniones (encuentros) entre muros del proyecto (UnionesPanel.tsx)
- [x] **19.3** Vista consolidada de materiales de todo el proyecto (Tab Proyecto con consolidado completo)
- [x] **19.4** Factor de desperdicio de placas configurable dinámicamente con slider interactivo (0-30%)

### Épica 20 — Gestión de proyectos ✅ 100%
- [x] **20.1** Guardar proyecto en localStorage (persistencia offline en tiempo real)
- [x] **20.2** Exportar proyecto a archivo JSON (descarga local)
- [x] **20.3** Importar proyecto desde archivo JSON (file input interactivo)
- [x] **20.4** Historial de cálculos (últimos N proyectos con persistencia local)

---

## 🟡 FASE 4 — Catálogos de Fabricantes Reales (Perú y LATAM)

> **Objetivo**: Soporte para catálogos locales de placas (Gyplac / Superboard de Eternit) y perfiles/estructuras (Tupemesa / Precor) utilizados en Perú y Latinoamérica, con tipologías verificadas.

### Épica 21 — Catálogo de Placas Gyplac / Superboard (Eternit)
- [ ] **21.1** Relevar las tipologías de placa de yeso Gyplac (ST, RH, RF) y placas de fibrocemento Superboard de Eternit Perú
- [ ] **21.2** Verificar dimensiones comerciales estándar de placas (1.22m x 2.44m, 1.20m x 2.40m) y espesores comunes (9.5mm, 12.5mm, 15mm)
- [ ] **21.3** Crear `gyplac_superboard.json` en el formato del schema de catálogo, incluyendo coeficientes de masa específicos
- [ ] **21.4** Tests de regresión: correr los Casos de Oro con el catálogo de placas de Eternit y registrar diferencias respecto al genérico

### Épica 22 — Catálogo de Estructuras Tupemesa / Precor
- [ ] **22.1** Relevar las especificaciones de perfilería metálica de Tupemesa y Precor (parantes y rieles galvanizados de 38mm, 64mm y 89mm)
- [ ] **22.2** Configurar los dos espesores comerciales estándar de Perú: 0.45 mm (no estructural / tabiquería interior) y 0.90 mm (estructural / portante / exterior)
- [ ] **22.3** Crear `tupemesa_precor.json` validado contra el schema de catálogo, con largos estándar de 3.00 metros
- [ ] **22.4** Tests de regresión de perfiles con catálogo local

### Épica 23 — Selector de catálogo en la web app
- [ ] **23.1** Dropdown "Catálogo de Referencia" en el formulario de la web app (Genérico, Gyplac/Eternit, Tupemesa/Precor)
- [ ] **23.2** Actualización dinámica de las opciones de perfil, placa y tipologías al cambiar de catálogo
- [ ] **23.3** Advertencia visual cuando se usa el catálogo "genérico" o combinaciones no estandarizadas de obra

### Épica 24 — Administrador de catálogos (para usuarios avanzados)
- [ ] **24.1** Pantalla de "editor de catálogo" que permita modificar valores numéricos del catálogo activo
- [ ] **24.2** Validación en tiempo real de los campos con el schema Zod del catálogo
- [ ] **24.3** Exportar catálogo personalizado a archivo JSON
- [ ] **24.4** Importar catálogo desde archivo JSON externo

---

## 🔴 FASE 5 — Integración BIM/IFC y Plugins CAD

> **Objetivo**: Lectura de planos de arquitectura (IFC, Revit, ArchiCAD) para generar el listado de muros automáticamente y ejecutar el motor de cálculo sobre la planta completa.
>
> **Rol requerido**: Especialista BIM/IFC (ver equipo) — esta fase no puede ser abordada sin alguien con experiencia real en el estándar IFC y las APIs de los softwares CAD.

### Épica 25 — Importador IFC (web-ifc)
- [ ] **25.1** Integrar `web-ifc` (WASM) en el paquete de importación
- [ ] **25.2** Parser de `IfcWall` / `IfcWallStandardCase` → extraer `largo_m` y `alto_m` del muro
- [ ] **25.3** Parser de `IfcOpeningElement` → extraer aberturas (tipo, dimensiones, posición)
- [ ] **25.4** Parser de `IfcMaterialLayerSet` → mapear capas a sistema constructivo del catálogo
- [ ] **25.5** Interfaz de importación en la web app: subir archivo `.ifc` y previsualizar los muros detectados
- [ ] **25.6** Mapper `IfcWall` → `Muro` (con confirmación manual para muros con datos ambiguos)

### Épica 26 — Resolución de ángulos no ortogonales
- [ ] **26.1** Detectar muros con encuentros a ángulos distintos de 90° (datos del IFC)
- [ ] **26.2** Integrar librería de clipping de polígonos (evaluar `polygon-clipping` o `Clipper2-wasm`)
- [ ] **26.3** Calcular el corte a inglete de perfiles para ángulos no rectos
- [ ] **26.4** Adaptar el nesting de placas para ángulos no ortogonales (actualmente solo rectángulos alineados a eje)
- [ ] **26.5** Nuevos Casos de Oro para encuentros a 45° y 60°

### Épica 27 — Plugin Revit
- [ ] **27.1** Crear proyecto C#/.NET con el SDK de la API de Revit
- [ ] **27.2** Leer `WallType`, `CompoundStructure` y `FamilyInstance` (puertas/ventanas) desde el modelo Revit
- [ ] **27.3** Llamar al motor TypeScript via API REST (la del Épica 11) o reescribir el motor en C# (evaluar)
- [ ] **27.4** Panel de Revit que muestre el resultado del cálculo dentro del mismo software
- [ ] **27.5** Exportar lista de materiales directamente al Schedule de Revit

### Épica 28 — Plugin ArchiCAD (Tapir Add-On)
- [ ] **28.1** Conectar con la API del Add-On Tapir (`tapir_archicad_commands`) para leer muros y aberturas desde ArchiCAD
- [ ] **28.2** Mapear los comandos de Tapir (`GetWalls`, `GetOpenings`) al modelo de datos de `Muro` y `Abertura`
- [ ] **28.3** Llamar al motor via API REST e inyectar los resultados en ArchiCAD (schedules de materiales)
- [ ] **28.4** Publicar el Add-On en el BIMcloud Marketplace de ArchiCAD

### Épica 29 — Planta completa (múltiples muros desde IFC)
- [ ] **29.1** Procesar una planta arquitectónica completa desde IFC (múltiples muros con sus uniones)
- [ ] **29.2** Detectar automáticamente las uniones/encuentros entre muros adyacentes y mapearlos a tipologías del catálogo
- [ ] **29.3** Vista de planta 2D con todos los muros renderizados y el resultado agregado de todo el proyecto
- [ ] **29.4** Reporte de materiales por ambiente/zona (agrupar muros por espacio o piso del IFC)

---

## 📊 Estimación Total del Proyecto

| Fase | Descripción | Épicas | Estimación | Estado |
|---|---|---|---|---|
| **Fase 1** | MVP Motor de Cálculo | 0–9 | ~28-30 días-persona | ✅ COMPLETADA |
| **Fase 2** | Proyecto Completo (Motor Maduro) | 10–16 | ~24-26 días-persona | ✅ COMPLETADA |
| **Fase 3** | Web App Visual | 17–24 | ~30-40 días-persona | ⬜ No iniciada |
| **Fase 4** | Catálogos fabricantes reales | 25–28 | ~15-20 días-persona | ⬜ No iniciada |
| **Fase 5** | Integración BIM/IFC + Plugins CAD | 29–37 | ~40-60 días-persona | ⬜ No iniciada |
| **Total** | | | **~140-180 días-persona** | |

> Las estimaciones asumen un desarrollador senior del perfil adecuado para cada fase. Se deben sumar las horas del **consultor técnico del rubro** (validación de fórmulas, especialmente Épicas 12 y 14) y el **especialista BIM/IFC** (Fase 5), que corren en paralelo y no están incluidos en las estimaciones de arriba.

---

## 🎯 Próximos 3 pasos inmediatos recomendados

1. **Épica 15** — Crear el paquete `web-app` utilizando Vite o Next.js y configurar los workspaces de npm para integrarlo con `@drywall-calc/core-engine`.
2. **Épica 16** — Desarrollar el formulario interactivo para ingresar la geometría, el sistema constructivo, aberturas y uniones de muros.
3. **Contratar al consultor técnico del rubro** para validar las especificaciones y el listado de materiales consolidados de la Fase 2 contra la práctica real en obra antes del lanzamiento de producción.
