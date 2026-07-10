# Backlog — Fase 1 (MVP con nesting)

Desglose accionable del roadmap de `planificacion-software-drywall.md` (Fase 1), siguiendo el orden de dependencias real: no tiene sentido programar tornillería antes de tener juntas, ni juntas antes de tener la grilla de placas. Cada ticket referencia la función correspondiente de `arquitectura-implementacion-contratos.md` (sección 4) y su criterio de aceptación está atado a un caso concreto de `casos-de-oro-referencia.md`.

**Cómo leer este backlog**: los tickets están en orden de ejecución obligatorio dentro de cada épica, y las épicas están ordenadas entre sí por dependencia. No conviene paralelizar entre épicas hasta que la anterior tenga sus tests en verde — cada una se apoya en la salida de la anterior.

---

## Épica 0 — Setup del repositorio

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 0.1 | Inicializar monorepo pnpm + workspaces (`core`, `catalog-data`) + `tsconfig.base.json` en modo `strict` | — | `pnpm install` corre limpio; un archivo `.ts` con un `any` implícito falla la compilación | 0.5d |
| 0.2 | Configurar ESLint + Prettier | 0.1 | `pnpm lint` sin errores en un commit vacío | 0.5d |
| 0.3 | Configurar Vitest + fast-check en `packages/core` | 0.1 | Un test dummy (`expect(1+1).toBe(2)`) corre con `pnpm test` | 0.5d |
| 0.4 | CI en GitHub Actions: lint + test en cada PR | 0.1–0.3 | Un PR con un test roto falla el check de CI | 0.5d |

---

## Épica 1 — Catálogo y tipos de dominio

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 1.1 | Definir `domain/catalogo.types.ts`, `proyecto.types.ts`, `resultado.types.ts` tal como están en `arquitectura-implementacion-contratos.md` sección 3 | 0.1 | Compila sin errores; se puede importar cada tipo desde otro archivo del paquete | 0.5d |
| 1.2 | Definir schema Zod del catálogo (`catalogo/schema.ts`) que valide la estructura de `arquitectura-implementacion-contratos.md` sección 3 | 1.1 | Un catálogo con un campo faltante (ej. sin `tornillos.perfil_perfil_por_union`) es rechazado con `CatalogoInvalidoError` | 1d |
| 1.3 | Escribir `catalog-data/generico-estandar.v1.json` con los valores definidos en `diseno-motor-nesting-catalogo-generico.md` sección 1 (incluye `tipologias_union`) | 1.2 | El archivo pasa la validación del schema de 1.2 sin errores | 0.5d |
| 1.4 | Implementar `catalogo/loader.ts` (carga + valida) | 1.2, 1.3 | `cargarCatalogo('generico-estandar.v1.json')` devuelve un objeto `Catalogo` tipado, listo para usar en los cálculos | 0.5d |

---

## Épica 2 — Utilidades geométricas base

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 2.1 | Implementar `geometry/tolerance.ts` (`EPS`, `roundUpSafe`, `iguales`) | 1.1 | `roundUpSafe(3.0000000001)` → `3`; `roundUpSafe(3.5)` → `4`; `iguales(1.2000001, 1.2)` → `true` | 0.5d |
| 2.2 | Implementar `geometry/rect.ts`: intersección de rectángulos, área, "contiene completamente" | 2.1 | Test unitario: dos rectángulos que se tocan en un borde tienen intersección de área 0 (no se cuentan como superpuestos) | 1d |

---

## Épica 3 — Nesting, paso 1: grilla base de placas

*Implementa `generarGrillaPlacas` (contrato en arquitectura, sección 4). Válida sin aberturas ni uniones todavía — eso viene en las épicas siguientes.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 3.1 | `generarGrillaPlacas`, orientación vertical, origen fijo en `x0_m=0` | 2.2 | **Caso A**: con muro 4.00×2.40 y placa 1.20×2.40 → devuelve 4 placas por cara (`ancho=1.20` × 3, `ancho=0.40` la última) | 1.5d |
| 3.2 | `generarGrillaPlacas`, orientación horizontal con desfase alternado por hilada (patrón de aparejo) | 3.1 | Test unitario: muro de 4.20m alto con placa 1.20×2.40 (2 hiladas) → la hilada 2 tiene sus columnas desfasadas 0.60m respecto a la hilada 1 | 1.5d |
| 3.3 | Soporte de `origen: { x0_m, simetrico }` configurable | 3.1, 3.2 | Test unitario: `simetrico=true` en un muro de 4.20m con placa de 1.20m reparte el recorte en ambos extremos, no solo al final | 1d |

**Checkpoint de épica**: correr el subconjunto del Caso A que involucra solo `generarGrillaPlacas` — debe dar 4 columnas por cara antes de seguir.

---

## Épica 4 — Nesting, paso 2: recorte por aberturas

*Implementa `aplicarAberturas`.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 4.1 | Recorte de placas que intersectan parcialmente una abertura (marcar `recortada: true`, no eliminar) | 3.1, 2.2 | **Caso B**: con el vano de puerta definido, las columnas 0 y 1 quedan marcadas `recortada: true`; el total sigue siendo 4 placas por cara | 1.5d |
| 4.2 | Descarte de placas cubiertas 100% por una abertura | 4.1 | Test unitario nuevo (no cubierto por los casos de oro actuales — agregar como "Caso E" a `casos-de-oro-referencia.md` cuando esto se programe): una columna angosta que cae enteramente dentro de un vano ancho no aparece en el resultado | 1d |
| 4.3 | Soporte de múltiples aberturas en el mismo muro, sin superposición entre ellas | 4.1, 4.2 | Test unitario: dos vanos (puerta + ventana) en el mismo muro, cada uno recorta solo las placas que le corresponden | 1d |

**Checkpoint de épica**: correr el subconjunto del Caso B (placas) — debe dar 4 placas por cara, 2 marcadas `recortada: true`.

---

## Épica 5 — Nesting, paso 3: extracción de juntas

*Implementa `extraerJuntas` — la pieza de la que dependen cinta y masilla.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 5.1 | Extracción de juntas verticales y horizontales entre placas adyacentes, sin aberturas | 3.1, 3.2 | **Caso A**: 3 juntas verticales internas × 2.40m = 7.20 ml por cara | 1.5d |
| 5.2 | Recorte de segmentos de junta que caen dentro de una abertura | 5.1, 4.1 | **Caso B**: la junta en `x=1.20` da 0.50 ml (solo el tramo sobre el dintel), no 2.60 ml | 1.5d |
| 5.3 | Desfase de juntas entre capas (`desfase_junta_vertical_min_m` del catálogo) | 5.1, 3.3 | **Caso D**: capa 1 con juntas en x=1.20/2.40, capa 2 con juntas en x=0.90/2.10/3.30 — ningún valor coincide | 1d |

**Checkpoint de épica**: correr Caso A y Caso B completos hasta juntas — los ML deben coincidir exactamente con los documentados.

---

## Épica 6 — Cálculo de perfiles (montantes y riel)

*Implementa `calcularPerfiles`. No depende del nesting de placas — depende de la geometría del muro, las aberturas y las uniones.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 6.1 | Fórmula base de montantes y riel, sin vanos ni uniones | 2.1 | **Caso A**: 11 montantes, 3 barras de riel | 1d |
| 6.2 | Regla de jambas dobles en vanos (tabla de casuística) | 6.1 | **Caso B**: 14 montantes (12 base + 2 de jamba); riel con tramo de piso interrumpido en el vano | 1.5d |
| 6.3 | Regla de perfil adicional por unión (esquina/T), sin duplicar entre los dos muros conectados | 6.1 | **Caso C**: muro_C1 con 10 montantes (9 base + 1 de unión), muro_C2 con 8 (sin duplicar el de la unión) | 1.5d |

---

## Épica 7 — Tornillería, cinta/masilla, aislante, esquineros

*Estas cuatro funciones consumen los resultados de las épicas 3-6, no tienen dependencias geométricas propias más allá de eso. Se pueden paralelizar entre sí una vez cerrada la Épica 6.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 7.1 | `calcularTornilleria` | 6.1 | **Caso A**: `placa_perfil=480`, `perfil_perfil=44`, `anclajes_losa=18` | 1d |
| 7.2 | `calcularCintaMasilla` a partir de `SegmentoJunta[]` | 5.1 | **Caso A**: `cinta.ml_total=14.40`, `cinta.rollos=1`, `masilla.kg_total=12.96`, `masilla.bolsas=1` | 1d |
| 7.3 | `calcularAislante` | — (solo necesita área neta) | **Caso A**: `9.60 m2`, `1 paquete` | 0.5d |
| 7.4 | `calcularEsquineros` | 6.3 | **Caso C**: `ml_total=2.40` | 1d |

---

## Épica 8 — Orquestador y validación de entrada

*Implementa `calcularMuro`, el único punto que conoce el orden completo y arma el `ResultadoMuro` final.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 8.1 | Validación de geometría y aberturas antes de calcular (dimensiones positivas, aberturas dentro del muro, sin superposición) | 1.1, 2.1 | Un muro con `alto_m: -1` lanza `GeometriaInvalidaError` con mensaje claro, antes de llegar al nesting | 1d |
| 8.2 | `calcularMuro`: orden completo grilla → aberturas → juntas → perfiles → tornillería/cinta/masilla/aislante/esquineros | Épicas 3-7, 8.1 | **Los 4 casos de oro (A, B, C, D) corren de punta a punta y el `ResultadoMuro` coincide exactamente con los valores documentados en `casos-de-oro-referencia.md`** | 2d |
| 8.3 | Armado del array `trazabilidad` (explicación textual de cada número) | 8.2 | Cada línea de `trazabilidad` documentada en los casos de oro aparece en el resultado real | 1d |

**Este es el checkpoint principal de la Fase 1**: cuando 8.2 esté en verde con los 4 casos de oro, el MVP del motor de cálculo está funcionalmente completo.

---

## Épica 9 — Hardening con testing de propiedades

*No bloquea el checkpoint de la Épica 8, pero conviene cerrarla antes de dar la Fase 1 por "terminada" — es la que encuentra los edge cases que ningún caso de oro cubre a mano.*

| # | Ticket | Depende de | Criterio de aceptación | Estimación |
|---|---|---|---|---|
| 9.1 | Property test: el área cubierta por placas nunca es menor al área neta del muro | 3.1 | `fast-check` corre 100+ combinaciones aleatorias de `largo_m`/`alto_m` sin fallos | 1d |
| 9.2 | Property test: la cantidad de placas/montantes/barras es siempre un entero ≥ 0 | 3.1, 6.1 | Igual que 9.1, para las funciones de perfiles | 0.5d |
| 9.3 | Property test: una abertura aleatoria dentro de los límites del muro nunca produce ML de junta negativo | 5.2 | `fast-check` con aberturas de tamaño/posición aleatoria (siempre válidas) | 1d |

---

## Resumen de dependencias (vista rápida)

```
Épica 0 (setup)
   └─▶ Épica 1 (catálogo) ──▶ Épica 2 (geometría base)
                                   └─▶ Épica 3 (grilla) ──▶ Épica 4 (aberturas) ──▶ Épica 5 (juntas)
                                   └─▶ Épica 6 (perfiles)
                                             └─▶ Épica 7 (tornillería/cinta/aislante/esquineros)
                                                       └─▶ Épica 8 (orquestador) ──▶ Épica 9 (hardening)
```

## Estimación total aproximada

~28-30 días-persona para un desarrollador senior del perfil "geometría computacional" (ver skill de equipo), trabajando solo en el motor de cálculo — sin contar el tiempo de validación de fórmulas con el consultor técnico del rubro, que debería correr en paralelo desde la Épica 1 (revisando el catálogo genérico) hasta el cierre de la Épica 8.

## Próximo paso

Con este backlog, el proyecto ya tiene las cuatro piezas necesarias antes de programar en serio: plan general, diseño del motor, casos de oro, contratos técnicos y ahora el desglose de tareas. El siguiente paso natural es empezar a picar código real — Épica 0 (setup del repo) es el punto de partida literal.
