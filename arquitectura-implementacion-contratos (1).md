# Arquitectura de implementación — Contratos técnicos

Traduce el diseño conceptual (`diseno-motor-nesting-catalogo-generico.md`) a decisiones de ingeniería concretas: qué stack, cómo se organiza el repo, y qué firma exacta tiene cada función. El objetivo es que cualquiera que programe una pieza sepa exactamente qué entra y qué sale, sin tener que adivinar.

---

## 1. Stack tecnológico (decisiones cerradas)

| Decisión | Elección | Motivo |
|---|---|---|
| Lenguaje | TypeScript 5.x, `strict: true` | Mismo lenguaje en motor, web app e importador IFC (ver conversación previa sobre decisión de lenguaje) |
| Gestor de paquetes / monorepo | pnpm workspaces | Permite separar `core-engine` de `web-app` sin duplicar dependencias, instala rápido |
| Testing | Vitest | Rápido, API compatible con Jest, se integra bien con TS y ESM sin configuración extra |
| Validación runtime de datos | Zod | El catálogo y el proyecto llegan como JSON externo (archivo, futuro importador IFC) — hay que validarlos en el borde del sistema, no confiar en el tipado estático únicamente |
| Lint / formato | ESLint + Prettier | Estándar, sin necesidad de justificar más |
| Clipping de polígonos | **Ninguna librería en el MVP** — geometría de rectángulos alineados a eje, resuelta a mano (ver sección 5). Evaluar `polygon-clipping` o similar recién en Fase 5, cuando haya que resolver ángulos no ortogonales entre muros | Cada muro se resuelve en su propio sistema de coordenadas local (x = a lo largo del muro, y = altura); dentro de ese sistema, placas y aberturas siempre son rectángulos alineados a eje, sin importar el ángulo real del muro en la planta. No hace falta clipping genérico de polígonos para esto — sería sobre-ingeniería en el MVP |
| Precisión numérica | `number` nativo (double), con tolerancia epsilon | El dominio trabaja en metros con precisión de milímetros; no hace falta precisión arbitraria (`decimal.js` u otros) |

---

## 2. Estructura de repositorio

```
drywall-calc/
├── packages/
│   ├── core-engine/                 # Motor de calculo, sin dependencia de UI
│   │   ├── src/
│   │   │   ├── types.ts             # Tipos de dominio (Muro, Union, Catalogo, etc.)
│   │   │   ├── nesting/
│   │   │   │   ├── generarGrillaPlacas.ts
│   │   │   │   ├── aplicarAberturas.ts
│   │   │   │   └── extraerJuntas.ts
│   │   │   ├── calculo/
│   │   │   │   ├── perfiles.ts
│   │   │   │   ├── tornilleria.ts
│   │   │   │   ├── cintaMasilla.ts
│   │   │   │   ├── aislante.ts
│   │   │   │   └── esquineros.ts
│   │   │   ├── orquestador.ts       # calcularMuro() -- une todo lo anterior
│   │   │   └── utils/
│   │   │       ├── redondeo.ts      # roundUpSafe, tolerancias
│   │   │       └── geometria.ts     # interseccion de rectangulos, etc.
│   │   ├── tests/
│   │   │   ├── fixtures/            # Casos de oro como JSON (ver seccion 6)
│   │   │   │   ├── caso-A-simple.json
│   │   │   │   ├── caso-B-abertura.json
│   │   │   │   ├── caso-C-esquina.json
│   │   │   │   └── caso-D-doble-capa.json
│   │   │   ├── nesting.test.ts
│   │   │   ├── perfiles.test.ts
│   │   │   ├── cintaMasilla.test.ts
│   │   │   └── orquestador.test.ts
│   │   └── package.json
│   ├── catalog-schemas/             # Esquemas Zod + catalogo generico por defecto
│   │   ├── src/
│   │   │   ├── catalogoSchema.ts
│   │   │   ├── proyectoSchema.ts
│   │   │   └── catalogos/
│   │   │       └── generico_estandar.json
│   │   └── package.json
│   └── web-app/                     # No se toca hasta Fase 3
├── pnpm-workspace.yaml
├── package.json
└── tsconfig.base.json
```

**Regla de dependencia estricta**: `core-engine` no importa nada de `web-app`, ni de ningún framework de UI. Solo depende de `catalog-schemas` (para los tipos) y, si hace falta, de utilidades matemáticas puras. Esto es lo que permite que el mismo motor corra en el navegador, en un backend Node, o eventualmente sea invocado desde un adaptador C# (Fase 5) sin reescribirlo.

---

## 3. Contratos de tipos (dominio)

```typescript
// types.ts

export interface CatalogoPerfil {
  codigo: string;
  ancho_mm: number;
  largo_barra_m: number;
  peso_kg_ml: number;
}

export interface CatalogoPlaca {
  tipo: string;
  nombre: string;
  espesor_mm: number;
  formatos_m: [number, number][];
  peso_kg_m2: number;
}

export interface TipologiaUnion {
  codigo: string;
  descripcion: string;
  n_muros_soportados: number;
  perfiles_adicionales: number;
  tratamiento_placa: "a_tope" | "envolvente";
  acabado: "cinta_papel" | "esquinero_metalico";
}

export interface Catalogo {
  sistema: string;
  perfiles: {
    montante: CatalogoPerfil[];
    riel: CatalogoPerfil[];
    separacion_montante_m_default: number;
    separaciones_permitidas_m: number[];
  };
  placas: CatalogoPlaca[];
  tornillos: {
    placa_perfil_por_m2: Record<string, number>; // clave: espesor ej "12.5mm"
    perfil_perfil_por_union: number;
    anclaje_losa_separacion_m: number;
  };
  cinta: { rendimiento_ml_por_rollo: number; factor_traslape: number; cantonera_incluida_en_esquinas_externas: boolean };
  masilla: { kg_por_ml_por_mano: number; manos_estandar: number; presentacion_kg_por_bolsa: number };
  aislante: { tipos: string[]; espesores_mm_recomendados_por_ancho_perfil: Record<string, number>; presentacion_m2_por_paquete: number };
  factor_desperdicio_placas_default: number;
  desfase_junta_vertical_min_m: number;
  tipologias_union: TipologiaUnion[];
}

export interface Abertura {
  tipo: "puerta" | "ventana" | "pase";
  ancho_m: number;
  alto_m: number;
  distancia_desde_inicio_m: number; // borde izquierdo del vano, medido desde el inicio del muro
}

export interface Muro {
  id: string;
  geometria: { largo_m: number; alto_m: number };
  sistema: {
    estructura: "simple" | "doble";
    caras: 1 | 2;
    capas_por_cara: number;
    perfil: string;   // codigo de CatalogoPerfil
    riel: string;
    separacion_montante_m: number;
  };
  placa: { tipo: string; espesor_mm: number; formato_m: [number, number]; orientacion: "vertical" | "horizontal" };
  aislante?: { tipo: string; espesor_mm: number };
  aberturas: Abertura[];
  encuentros: string[]; // ids de Union
}

export interface Union {
  id: string;
  muros_conectados: string[]; // ids de Muro
  angulo_grados: number;
  tipo_union: string; // codigo de TipologiaUnion
  config_modulacion: { resetear_perfiles: boolean; perfiles_simetricos: boolean };
}

export interface Proyecto {
  proyecto: string;
  catalogo: string;
  elementos: Muro[];
  uniones: Union[];
}
```

---

## 4. Contratos de resultados intermedios

```typescript
export interface PlacaRect {
  id: string;
  x: number;       // metros, coordenada local del muro
  y: number;
  ancho: number;
  alto: number;
  cara: "A" | "B";
  capa: number;     // 1, 2, ...
  recortada: boolean;
}

export interface JuntaSegmento {
  orientacion: "vertical" | "horizontal";
  coordenada_fija: number;  // x si es vertical, y si es horizontal
  inicio: number;            // y si vertical, x si horizontal
  fin: number;
  longitud: number;
  cara: "A" | "B";
  capa: number;
}

export interface ResultadoPerfiles {
  montantes: number;
  rieles_barras: number;
  montantes_refuerzo_vanos: number;
  montantes_union: number;
}

export interface ResultadoTornillos {
  placa_perfil: number;
  perfil_perfil: number;
  anclajes_losa: number;
}

export interface ResultadoCintaMasilla {
  cinta: { ml_total: number; rollos: number };
  masilla: { kg_total: number; bolsas: number };
}

export interface ResultadoMuro {
  muro_id: string;
  placas: { cantidad_total: number; detalle: PlacaRect[] };
  perfiles: ResultadoPerfiles;
  tornillos: ResultadoTornillos;
  cinta: { ml_total: number; rollos: number };
  masilla: { kg_total: number; bolsas: number };
  aislante: { m2: number; paquetes: number };
  esquineros: { ml_total: number };
  trazabilidad: string[];
}
```

---

## 5. Contratos de funciones (firmas exactas)

Cada función corresponde 1:1 a un paso del algoritmo de nesting ya diseñado. El orden de implementación recomendado sigue esta misma lista.

```typescript
// nesting/generarGrillaPlacas.ts
// Genera la grilla base de placas para UNA cara y UNA capa, sin considerar aberturas.
// origen_x_m permite desplazar el inicio de la grilla (usado por config_modulacion de una Union).
export function generarGrillaPlacas(params: {
  largo_m: number;
  alto_m: number;
  formato_m: [number, number];
  orientacion: "vertical" | "horizontal";
  origen_x_m?: number;   // default 0
  cara: "A" | "B";
  capa: number;
}): PlacaRect[];

// nesting/aplicarAberturas.ts
// Recorta/descarta placas segun las aberturas del muro. Placas 100% contenidas en una
// abertura se eliminan del resultado; las parcialmente intersectadas se marcan recortada=true
// pero NO se descuenta su area (siguen consumiendo 1 unidad comercial).
export function aplicarAberturas(placas: PlacaRect[], aberturas: Abertura[]): PlacaRect[];

// nesting/extraerJuntas.ts
// A partir de la grilla ya recortada, calcula los segmentos de junta reales (vertical y
// horizontal), excluyendo los tramos que caen dentro de una abertura.
export function extraerJuntas(placas: PlacaRect[], aberturas: Abertura[]): JuntaSegmento[];

// calculo/perfiles.ts
// Calcula montantes, rieles y refuerzos. Recibe las Union relevantes para sumar
// perfiles_adicionales del catalogo y detectar jambas dobles por abertura.
export function calcularPerfiles(muro: Muro, unionesDelMuro: Union[], catalogo: Catalogo): ResultadoPerfiles;

// calculo/tornilleria.ts
export function calcularTornilleria(
  muro: Muro,
  areaNetaM2: number,
  resultadoPerfiles: ResultadoPerfiles,
  catalogo: Catalogo
): ResultadoTornillos;

// calculo/cintaMasilla.ts
export function calcularCintaMasilla(juntas: JuntaSegmento[], catalogo: Catalogo): ResultadoCintaMasilla;

// calculo/aislante.ts
export function calcularAislante(areaNetaM2: number, catalogo: Catalogo): { m2: number; paquetes: number };

// calculo/esquineros.ts
export function calcularEsquineros(unionesDelMuro: Union[], muro: Muro, catalogo: Catalogo): { ml_total: number };

// orquestador.ts
// Une todos los pasos anteriores en el orden correcto y arma el contrato de salida final.
export function calcularMuro(muro: Muro, uniones: Union[], catalogo: Catalogo): ResultadoMuro;
```

**Por qué separar `aplicarAberturas` de `extraerJuntas`** (y no resolver todo junto): son responsabilidades distintas — una decide qué placas se necesitan, la otra mide juntas sobre el resultado ya definitivo. Mantenerlas separadas es lo que permite testear cada una contra su propio caso de oro sin que un bug en una tape el resultado de la otra.

---

## 6. Casos de oro como fixtures de test

Los 4 casos de `casos-de-oro-referencia.md` se convierten en archivos JSON reales dentro de `tests/fixtures/`, con el input y el output esperado en el mismo archivo:

```json
// tests/fixtures/caso-A-simple.json
{
  "input": { "muro": { /* ... */ }, "catalogo": "generico_estandar" },
  "output_esperado": { /* ... el bloque "Output esperado" del documento ... */ }
}
```

Patrón de test (Vitest):

```typescript
// tests/orquestador.test.ts
import { describe, it, expect } from "vitest";
import { calcularMuro } from "../src/orquestador";
import casoA from "./fixtures/caso-A-simple.json";

describe("calcularMuro", () => {
  it("Caso A - muro simple sin aberturas", () => {
    const resultado = calcularMuro(casoA.input.muro, [], catalogoGenerico);
    expect(resultado.placas.cantidad_total).toBe(casoA.output_esperado.placas.cantidad_total);
    expect(resultado.perfiles.montantes).toBe(casoA.output_esperado.perfiles.montantes);
    expect(resultado.cinta.ml_total).toBeCloseTo(casoA.output_esperado.cinta.ml_total, 2);
    // ... resto de campos
  });
});
```

Usar `toBeCloseTo` (no `toBe`) para todo valor que involucre metros/kg calculados con decimales — evita falsos negativos por precisión de punto flotante.

---

## 7. Manejo de tolerancias numéricas (el bug más común en este dominio)

Un caso concreto que **hay que resolver desde el día uno**: `3.60 / 1.20` en JavaScript puede devolver `2.9999999999999996` en vez de `3` exacto, por representación binaria de punto flotante. Si `ROUNDUP` se aplica directo sobre ese resultado, da `3` igual (porque `Math.ceil` de un número apenas menor a 3 igual da 3)... pero el caso inverso es el peligroso: un valor que matemáticamente es "3.0 exacto" puede llegar como `3.0000000000000004`, y ahí `Math.ceil` devolvería `4` en vez de `3` — una placa o un montante de más, silenciosamente, en cada cálculo.

```typescript
// utils/redondeo.ts
const EPSILON = 1e-9;

export function roundUpSafe(valor: number): number {
  return Math.ceil(valor - EPSILON);
}
```

**Regla de convención**: cualquier `ROUNDUP`/`ROUNDDOWN` del motor pasa por `roundUpSafe`/`roundDownSafe`, nunca por `Math.ceil`/`Math.floor` directo. Esto se verifica con un test dedicado (no un caso de oro de negocio, sino un test de la utilidad en sí) que pruebe exactamente los bordes: `roundUpSafe(3.0000000001)` debe dar `3`, no `4`.

---

## 8. Convención de nombres

- **Nombres de dominio en español** (`Muro`, `Union`, `Catalogo`, `calcularPerfiles`), consistente con los documentos de diseño y con el vocabulario del consultor técnico del rubro — así la conversación entre código y experto de obra no requiere traducción mental.
- **Utilidades genéricas en inglés** (`roundUpSafe`, `Rect`, tipos auxiliares sin semántica de dominio) — es lo esperado en el ecosistema TS/npm y evita mezclar convenciones dentro del mismo archivo.
- Archivos de test nombrados `<modulo>.test.ts`, uno por archivo de `src/`, sin agrupar de más.

## 9. Validación de datos externos (Zod)

El catálogo y el proyecto siempre entran como JSON (archivo cargado, futura respuesta de un importador IFC). Se validan en el borde del sistema, antes de que cualquier función del motor los toque:

```typescript
// catalog-schemas/src/proyectoSchema.ts
import { z } from "zod";

export const AberturaSchema = z.object({
  tipo: z.enum(["puerta", "ventana", "pase"]),
  ancho_m: z.number().positive(),
  alto_m: z.number().positive(),
  distancia_desde_inicio_m: z.number().nonnegative(),
});

export const MuroSchema = z.object({
  id: z.string(),
  geometria: z.object({ largo_m: z.number().positive(), alto_m: z.number().positive() }),
  // ... resto de campos
  aberturas: z.array(AberturaSchema),
}).refine(
  (muro) => muro.aberturas.every(a => a.distancia_desde_inicio_m + a.ancho_m <= muro.geometria.largo_m),
  { message: "Una abertura no puede sobresalir del largo del muro" }
);
```

Este tipo de regla (`refine`) es donde conviene ir sumando, con el tiempo, las validaciones que surjan de casos reales de obra — es la forma de que el consultor técnico del rubro "inyecte" reglas de negocio sin tocar el algoritmo de cálculo en sí.

---

## 10. Siguiente paso

Con esto ya hay suficiente para abrir el repo y empezar a programar en orden: `roundUpSafe` → `generarGrillaPlacas` (validado contra Caso A) → `aplicarAberturas` (Caso B) → `extraerJuntas` → `calcularPerfiles`/`calcularTornilleria`/`calcularCintaMasilla`/`calcularAislante` → `orquestador.calcularMuro`. Esto coincide con el orden que ya habíamos anticipado en el documento de casos de oro.
