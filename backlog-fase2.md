# Backlog — Fase 2 (Proyecto completo)

Continúa la numeración de épicas de `backlog-fase1.md` (que llegó hasta la Épica 9). Cubre lo que dice el roadmap para esta fase: múltiples muros/ambientes, motor de reglas de casuística completo (estructura doble, zonas húmedas/RF, muros altos con empalme), y exportación.

**Punto de partida verificado en el repo actual** (no supuesto — confirmado leyendo el código):
- `ProyectoSchema` y `UnionSchema` **ya existen** en `packages/catalog-schemas/src/proyectoSchema.ts` — el trabajo de validación Zod de esta fase está adelantado.
- **No existe ninguna función `calcularProyecto`** — el Caso C de la Fase 1 consolida los resultados de dos muros a mano, dentro del propio archivo de test (`orquestador.test.ts`, líneas 61-94). Eso funciona como caso de oro puntual, pero no es el orquestador real que necesita un proyecto de N muros.
- `sistema.estructura: "simple" | "doble"` existe en el tipo `Muro`, pero **`calcularPerfiles` lo ignora por completo** — no duplica perfiles ni aislante cuando vale `"doble"`.
- `calcularPerfiles` y `calcularEsquineros` ya soportan uniones con `n_muros_soportados` genérico (no están hardcodeados a 2 muros), así que una unión en T de 3 muros debería funcionar con la lógica actual — falta el caso de oro que lo confirme.
- No hay soporte para muros más altos que el largo de barra comercial (empalme de montante) — `calcularPerfiles` no lo contempla.
- No hay agrupador `Ambientes`, ni exportación a Excel/PDF.

---

## Épica 10 — Orquestador de Proyecto (`calcularProyecto`)

*Es la pieza que falta antes que cualquier otra cosa de esta fase — sin esto, "proyecto con múltiples muros" sigue siendo un test manual.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 10.1 | Validación de integridad referencial del proyecto: cada `union.muros_conectados` debe apuntar a `id` de muros que existen en `proyecto.muros`; cada `muro.encuentros` debe apuntar a `id` de uniones que existen | `ProyectoSchema` (ya existe) | Un proyecto con una unión que referencia un muro inexistente lanza un error tipado (`ProyectoInvalidoError`), no un `undefined` silencioso | 1d |
| 10.2 | Implementar `calcularProyecto(proyecto, catalogo): ResultadoProyecto`, que llama a `calcularMuro` por cada muro (reusando la lógica ya existente) y consolida cinta/masilla/aislante a nivel proyecto (mismo cálculo que hoy está a mano en el test del Caso C) | 10.1 | El **Caso C de la Fase 1**, corrido a través de `calcularProyecto` (no manualmente sumado en el test), da exactamente los mismos totales ya documentados | 2d |
| 10.3 | Reemplazar la suma manual del test `orquestador.test.ts` (Caso C) por una llamada real a `calcularProyecto`, para no dejar dos caminos de cálculo (uno "de verdad" y uno "a mano en el test") | 10.2 | El test de integración del Caso C queda expresado como `calcularProyecto(casoC.input, catalogo)`, no como suma manual de `res1`/`res2` | 0.5d |

**Checkpoint de épica**: el Caso C ya no es un caso especial resuelto a mano — es un proyecto real de 2 muros pasado por el orquestador de proyecto.

---

## Épica 11 — Uniones extendidas (T, cruces, más de 2 muros)

*El código de `calcularPerfiles`/`calcularEsquineros` ya está escrito de forma genérica (usa `union.muros_conectados` sin asumir longitud 2), pero nunca se probó con 3+ muros — hay que confirmarlo con un caso real, no asumirlo.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 11.1 | Agregar tipología de unión "T" al catálogo genérico (`n_muros_soportados: 3`) | Épica 10 | El catálogo valida sin errores con la nueva entrada | 0.5d |
| 11.2 | **Caso de oro nuevo — "Caso F: unión en T"**: 3 muros que confluyen en un nodo, agregar a `casos-de-oro-referencia.md` con valores calculados a mano | 11.1 | Documento actualizado con input/output/trazabilidad, igual que los Casos A-D | 1d |
| 11.3 | Ejecutar el Caso F contra `calcularProyecto` y corregir `calcularPerfiles`/`calcularEsquineros` si aparece algún caso no contemplado (ej. more de un muro "dueño" de la unión, reparto de perfiles adicionales entre 3 muros en vez de asignarlos todos al primero alfabético) | 11.2 | Caso F pasa exactamente contra el valor documentado | 1.5d |
| 11.4 | Soporte de ángulo no ortogonal en una unión (ej. 60°, como el ejemplo de la interfaz de Pladur visto antes): corte a inglete en la longitud de perfil consumida en el nodo | 11.3 | Test unitario: unión a 60° entre dos muros de igual altura consume más longitud de perfil en el nodo que una unión a 90° (por el corte en ángulo), verificable con trigonometría simple | 2d |

---

## Épica 12 — Casuística: estructura doble

*El campo existe en el tipo pero no tiene efecto — esta épica lo activa de verdad.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 12.1 | En `calcularPerfiles`: si `sistema.estructura === "doble"`, duplicar la línea de montantes y riel (dos líneas independientes de estructura, separadas por el espesor de aislante) | Épica 10 | Test unitario: mismo muro, `estructura: "simple"` vs `"doble"` → montantes y rieles se duplican exactamente x2 | 1.5d |
| 12.2 | En `calcularAislante`: con estructura doble, el área neta a aislar sigue siendo la misma (una sola vez), pero el catálogo debe permitir un espesor de aislante distinto por línea de estructura si corresponde | 12.1 | Test unitario específico, no cubierto por los casos de oro actuales | 1d |
| 12.3 | **Caso de oro nuevo — "Caso G: estructura doble"**, agregar a `casos-de-oro-referencia.md` | 12.1, 12.2 | Documento actualizado y test de regresión correspondiente en verde | 1d |

---

## Épica 13 — Casuística: zonas húmedas (placa RH) y resistencia al fuego (placa RF)

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 13.1 | Agregar entradas `RH` y `RF` al catálogo genérico (`generico_estandar.json`), con su `espesor_mm` y `peso_kg_m2` propios | Épica 10 | El catálogo valida sin errores | 0.5d |
| 13.2 | Confirmar que `calcularTornilleria` usa la densidad de tornillos correcta según el `espesor_mm` real de la placa seleccionada (ya lo hace vía `placa_perfil_por_m2[espesor+"mm"]`, pero falta un test explícito con placa RF de 15mm) | 13.1 | Test unitario: muro con placa RF (15mm) usa la densidad de tornillos de 15mm del catálogo, distinta a la de 12.5mm | 1d |
| 13.3 | Agregar `peso_kg_m2` al `ResultadoMuro` (hoy no se reporta el peso total de placa instalada — dato relevante para flete/carga estructural) | 13.1 | El resultado incluye `placas.peso_total_kg`, calculado como área instalada × `peso_kg_m2` de la placa seleccionada | 1d |

---

## Épica 14 — Casuística: muros altos con empalme de montante

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 14.1 | En `calcularPerfiles`: si `alto_m` del muro supera `largo_barra_m` del perfil de montante, calcular el empalme (montante adicional de refuerzo en el punto de unión, o barra extra según regla del catálogo) | Épica 10 | Test unitario: muro de 3.20m con montante de barra de 3.00m requiere empalme; muro de 2.80m no lo requiere | 1.5d |
| 14.2 | **Caso de oro nuevo — "Caso H: muro alto con empalme"** | 14.1 | Documento actualizado y test de regresión en verde | 1d |

---

## Épica 15 — Modelo de Ambientes (agrupador)

*Del modelo de datos original: `Proyecto → Ambientes → Elementos constructivos`. Hoy `Proyecto` va directo a `muros`, sin agrupador intermedio.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 15.1 | Extender `ProyectoSchema`/`Proyecto` con `ambientes: Ambiente[]` opcional, donde cada `Ambiente` agrupa un subconjunto de `muro_id` | Épica 10 | Proyectos existentes (sin `ambientes`) siguen validando sin cambios — el campo es opcional y retrocompatible | 1d |
| 15.2 | `calcularProyecto` agrega un desglose de resultados por ambiente además del total del proyecto | 15.1, 10.2 | `ResultadoProyecto.por_ambiente` existe y suma exactamente al total general | 1.5d |

---

## Épica 16 — Exportación a Excel/PDF

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 16.1 | Decidir librería de generación (ej. `exceljs` para Excel; evaluar `pdf-lib` o generación HTML→PDF para el PDF) — este ticket es de spike/decisión, no de implementación | Épica 10 | Documento corto de decisión con librería elegida y por qué | 0.5d |
| 16.2 | Exportador de `ResultadoProyecto` a Excel: una hoja de resumen de materiales (placas, perfiles, tornillos, cinta, masilla, aislante, esquineros) y una hoja de detalle por muro | 16.1, 10.2 | El archivo generado abre sin errores en Excel/LibreOffice y los totales coinciden con el `ResultadoProyecto` de origen | 2d |
| 16.3 | Exportador a PDF con el mismo contenido, formateado como presupuesto/lista de materiales legible | 16.1, 16.2 | PDF generado con las mismas cifras que el Excel, sin discrepancias | 2d |

---

## Resumen de dependencias

```
Epica 10 (orquestador de proyecto)  <- bloquea todo lo demas de esta fase
   ├─▶ Epica 11 (uniones T/angulos)
   ├─▶ Epica 12 (estructura doble)
   ├─▶ Epica 13 (zonas humedas/RF)
   ├─▶ Epica 14 (empalme de montante)
   ├─▶ Epica 15 (ambientes)
   └─▶ Epica 16 (exportacion) -- depende ademas de 10.2 especificamente
```
Las Épicas 11-15 son independientes entre sí una vez cerrada la 10 — se pueden paralelizar si hay más de un desarrollador. La Épica 16 conviene dejarla para el final, porque exporta el resultado consolidado y cualquier cambio de las épicas anteriores en la forma de `ResultadoProyecto` la obligaría a reajustarse.

## Estimación total aproximada

~24-26 días-persona, sin contar la validación de las nuevas reglas de casuística (estructura doble, empalme, RH/RF) con el consultor técnico del rubro — que debería revisar especialmente las Épicas 12 y 14, son las que más se apartan de fórmulas de "libro" y más dependen de práctica real de obra.

## Nota importante antes de arrancar

Antes de tocar código de esta fase, aplicar el patch de la Fase 1 (`fix-build-ci-lint.patch`) si todavía no se hizo — de lo contrario cualquier ticket nuevo va a heredar el mismo problema de build/CI que encontramos.
