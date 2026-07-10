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

## 🔵 FASE 2 — API REST + CLI (Motor Expuesto como Servicio)

> **Objetivo**: Hacer que el motor pueda ser consumido externamente por cualquier cliente (web, CLI, Postman, futuros frontends).
>
> **Prerrequisito crítico**: Antes de comenzar, validar el catálogo genérico y las fórmulas con un consultor técnico del rubro (instalador/calculista), comparando los resultados contra Pladur Calc o Knauf.

### Épica 10 — Validación técnica de obra (NO PROGRAMACIÓN)
- [ ] **10.1** Buscar y contratar un consultor técnico del rubro (instalador o calculista de drywall) — rol #3 de la skill de equipo
- [ ] **10.2** Correr los Casos de Oro A y B en una calculadora comercial real (Pladur Calc / Knauf) y comparar resultados
- [ ] **10.3** Documentar discrepancias (si las hay) y ajustar el catálogo genérico y/o las fórmulas
- [ ] **10.4** Actualizar `casos-de-oro-referencia.md` con la fuente de validación de cada caso

### Épica 11 — Nuevo paquete `api-server`
- [ ] **11.1** Crear `packages/api-server` con Express o Fastify + TypeScript
- [ ] **11.2** Endpoint `POST /calcular-muro` que recibe `{ muro, uniones, catalogo? }` y devuelve `ResultadoMuro`
- [ ] **11.3** Middleware de validación Zod en la frontera HTTP (rechaza JSON inválido antes de tocar el motor)
- [ ] **11.4** Endpoint `GET /catalogo/:id` para consultar catálogos disponibles
- [ ] **11.5** Respuestas de error claras y tipadas (`GeometriaInvalidaError` → HTTP 400 con mensaje descriptivo)
- [ ] **11.6** Tests de integración HTTP con Vitest + supertest para cada endpoint

### Épica 12 — CLI interactivo
- [ ] **12.1** Crear `packages/cli` con un script ejecutable via `npx drywall-calc <archivo.json>`
- [ ] **12.2** Output en tabla formateada en terminal (usando `chalk` o similar)
- [ ] **12.3** Flag `--formato=json` para output en JSON crudo (para integración con otros scripts)
- [ ] **12.4** Flag `--catalogo=<ruta.json>` para usar un catálogo externo personalizado
- [ ] **12.5** Modo `--validar-solo` que solo corre las validaciones Zod sin calcular

### Épica 13 — Documentación de la API
- [ ] **13.1** Generar especificación OpenAPI 3.0 (Swagger) de los endpoints
- [ ] **13.2** Página de documentación interactiva (Swagger UI o Redoc) servida junto con la API
- [ ] **13.3** `README.md` actualizado con ejemplos de uso via cURL y CLI

### Épica 14 — Deployment de la API
- [ ] **14.1** Dockerfile para el servidor API
- [ ] **14.2** Publicar `@drywall-calc/cli` en npm para instalación global
- [ ] **14.3** Actualizar CI/CD en GitHub Actions para build y tests del nuevo paquete

---

## 🟠 FASE 3 — Web App (Interface Visual)

> **Objetivo**: Aplicación web que permita ingresar un muro, ver la grilla de placas en pantalla y obtener el listado de materiales.

### Épica 15 — Setup `web-app` con framework
- [ ] **15.1** Crear `packages/web-app` con Next.js o Vite + React + TypeScript
- [ ] **15.2** Configurar integración con `@drywall-calc/core-engine` como dependencia local del workspace
- [ ] **15.3** Definir design system: paleta, tipografía, tokens de espacio
- [ ] **15.4** Layout base: sidebar de configuración + panel de visualización principal

### Épica 16 — Formulario de entrada de muro
- [ ] **16.1** Campos para geometría del muro (largo, alto)
- [ ] **16.2** Selector de sistema constructivo (perfil, separación de montantes, caras, capas)
- [ ] **16.3** Selector de placa (tipo, espesor, formato, orientación) con las opciones del catálogo activo
- [ ] **16.4** Formulario para agregar/editar/eliminar aberturas (tipo, ancho, alto, posición desde inicio)
- [ ] **16.5** Validaciones en tiempo real: mostrar errores Zod inline en el formulario
- [ ] **16.6** Botón "Calcular" que invoca `calcularMuro()` del motor

### Épica 17 — Visualizador 2D de la grilla de placas
- [ ] **17.1** Canvas/SVG que renderiza la grilla de placas del muro usando las coordenadas `(x, y, ancho, alto)` del `ResultadoMuro.placas.detalle`
- [ ] **17.2** Colorear diferente: placa completa vs. placa recortada (`recortada: true`)
- [ ] **17.3** Dibujar el área de las aberturas (vanos de puerta/ventana) en el canvas
- [ ] **17.4** Toggle entre "Cara A" y "Cara B" para muros de dos caras
- [ ] **17.5** Toggle entre capas (para muros con `capas_por_cara > 1`)
- [ ] **17.6** Mostrar juntas sobre el canvas (líneas diferenciadas entre placas)
- [ ] **17.7** Zoom y paneo básico en el canvas

### Épica 18 — Panel de resultados de materiales
- [ ] **18.1** Tabla de resumen de materiales (placas, perfiles, tornillos, cinta, masilla, aislante, esquineros)
- [ ] **18.2** Sección de trazabilidad desplegable (explica cada número)
- [ ] **18.3** Botón de exportar a PDF (con `jsPDF` o similar)
- [ ] **18.4** Botón de exportar a Excel/CSV la tabla de materiales
- [ ] **18.5** Compartir resultado via URL (estado del muro serializado en query params)

### Épica 19 — Proyecto multi-muro
- [ ] **19.1** Capacidad de definir un proyecto con múltiples muros
- [ ] **19.2** Definición de uniones (encuentros) entre muros del proyecto (grafo de muros)
- [ ] **19.3** Vista consolidada de materiales de todo el proyecto (suma de muros + factores de merma)
- [ ] **19.4** Factor de desperdicio configurable por proyecto (`factor_desperdicio_placas_default` del catálogo)

### Épica 20 — Gestión de proyectos
- [ ] **20.1** Guardar proyecto en localStorage (persistencia offline)
- [ ] **20.2** Exportar proyecto a archivo JSON
- [ ] **20.3** Importar proyecto desde archivo JSON
- [ ] **20.4** Historial de cálculos (últimos N proyectos)

---

## 🟡 FASE 4 — Catálogos de Fabricantes Reales

> **Objetivo**: Soporte para catálogos de Pladur, Knauf y otros fabricantes reales, con tipologías verificadas.

### Épica 21 — Catálogo Pladur
- [ ] **21.1** Relevar las tipologías reales de unión del catálogo Pladur (1.1-1, 1.1-2, 1.3-1, 1.3-2, 1.5)
- [ ] **21.2** Verificar con consultor técnico que los `perfiles_adicionales` y `tratamiento_placa` son correctos
- [ ] **21.3** Crear `pladur_estandar.json` en el formato del schema de catálogo
- [ ] **21.4** Tests de regresión: correr los Casos de Oro con el catálogo Pladur y documentar diferencias respecto al genérico

### Épica 22 — Catálogo Knauf
- [ ] **22.1** Relevar las especificaciones técnicas del catálogo Knauf (tipologías de sistema W111, W112, W113, etc.)
- [ ] **22.2** Crear `knauf_estandar.json` validado contra el schema
- [ ] **22.3** Tests de regresión con catálogo Knauf

### Épica 23 — Selector de catálogo en la web app
- [ ] **23.1** Dropdown "Fabricante / Catálogo" en el formulario de la web app
- [ ] **23.2** Actualización dinámica de las opciones de perfil, placa y tipologías al cambiar de catálogo
- [ ] **23.3** Advertencia visual cuando se usa el catálogo "genérico" (aún no validado de fábrica)

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

| Fase | Descripción | Estimación | Estado |
|---|---|---|---|
| **Fase 1** | MVP Motor de Cálculo | ~28-30 días-persona | ✅ COMPLETADA |
| **Fase 2** | API REST + CLI | ~15-20 días-persona | ⬜ No iniciada |
| **Fase 3** | Web App Visual | ~30-40 días-persona | ⬜ No iniciada |
| **Fase 4** | Catálogos fabricantes reales | ~15-20 días-persona | ⬜ No iniciada |
| **Fase 5** | Integración BIM/IFC + Plugins CAD | ~40-60 días-persona | ⬜ No iniciada |
| **Total** | | **~130-170 días-persona** | |

> Las estimaciones asumen un desarrollador senior del perfil adecuado para cada fase. Se deben sumar las horas del **consultor técnico del rubro** (validación de fórmulas en Fases 1-4) y el **especialista BIM/IFC** (Fase 5), que corren en paralelo y no están incluidos en las estimaciones de arriba.

---

## 🎯 Próximos 3 pasos inmediatos recomendados

1. **Contratar/contactar al consultor técnico del rubro** (Épica 10) — es el paso más crítico y el que más se subestima
2. **Validar Casos de Oro A y B** contra Pladur Calc o Knauf antes de construir la UI encima de fórmulas sin validar
3. **Arrancar la Fase 2 (API REST)** — es la base que conectará el motor con la web app y los futuros plugins
