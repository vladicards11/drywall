# Casos de oro — Banco de casos de prueba de referencia

## Propósito y cómo usar este documento

Este documento define un conjunto de casos de entrada/salida **calculados a mano, aplicando exactamente las fórmulas y el algoritmo de nesting definidos en `diseno-motor-nesting-catalogo-generico.md`**, usando el catálogo genérico como fuente de valores. Sirven como:

1. **Tests de regresión** para el motor de cálculo (TDD): se programa una función, se corre contra el caso, y el resultado debe coincidir.
2. **Contrato de comportamiento esperado** entre quien programa el motor y quien valida las reglas de negocio (el consultor técnico del rubro, ver skill de equipo).

**Importante — validación pendiente**: estos valores son correctos *según nuestras propias reglas de diseño*, pero todavía no fueron contrastados contra una calculadora comercial real (Pladur Calc, Knauf). Antes de darlos por definitivos como verdad de obra, conviene correr al menos los Casos A y B en una calculadora de mercado y ajustar si hay discrepancias — probablemente en redondeos, refuerzos de vano, o densidades de tornillo. Cuando eso pase, actualizar este documento y anotar la fuente de validación en cada caso.

Catálogo usado en todos los casos: `generico_estandar` (ver sección 1 de `diseno-motor-nesting-catalogo-generico.md`), perfil M48/R48, separación de montante 0.40m salvo que se indique otra cosa.

---

## Caso A — Muro simple, sin aberturas, sin encuentros

**Input**
```json
{
  "id": "muro_A",
  "geometria": { "largo_m": 4.00, "alto_m": 2.40 },
  "sistema": { "estructura": "simple", "caras": 2, "capas_por_cara": 1, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
  "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
  "aberturas": [],
  "encuentros": []
}
```

**Derivación clave**
- Alto muro (2.40) = alto placa (2.40) → orientación vertical, 1 sola hilada, sin juntas horizontales
- Montantes = ROUNDUP(4.00/0.40)+1 = 11
- Riel = ROUNDUP(8.00/3.00) = 3 barras
- Columnas de placa = ROUNDUP(4.00/1.20) = 4 → 4 placas/cara
- Juntas verticales = 3 internas × 2.40m = 7.20 ml/cara

**Output esperado**
```json
{
  "placas": { "cantidad_total": 8 },
  "perfiles": { "montantes": 11, "rieles_barras": 3, "montantes_refuerzo_vanos": 0 },
  "tornillos": { "placa_perfil": 480, "perfil_perfil": 44, "anclajes_losa": 18 },
  "cinta": { "ml_total": 14.40, "rollos": 1 },
  "masilla": { "kg_total": 12.96, "bolsas": 1 },
  "aislante": { "m2": 9.60, "paquetes": 1 },
  "esquineros": { "ml_total": 0 },
  "trazabilidad": [
    "Montantes: 4.00/0.40 + 1 = 11 (sin ajustes, no hay esquinas ni vanos)",
    "Placas: modulacion vertical 1 hilada, 4 columnas x 2 caras x 1 capa = 8",
    "Juntas: 3 juntas verticales internas x 2.40m x 2 caras = 14.40 ml",
    "Tornillos placa-perfil: area neta 9.60 x 2 caras x 25/m2 = 480",
    "Tornillos perfil-perfil: 11 montantes x 2 uniones x 2 tornillos/union = 44",
    "Anclajes losa: 2 tramos de riel de 4.00m, ROUNDUP(4.00/0.50)+1=9 c/u = 18",
    "Aislante: 9.60 m2 (una vez, no por cara) / 12 m2 por paquete = 1 paquete"
  ]
}
```

---

## Caso B — Muro con abertura (puerta), sin encuentros

**Input**
```json
{
  "id": "muro_B",
  "geometria": { "largo_m": 4.20, "alto_m": 2.60 },
  "sistema": { "estructura": "simple", "caras": 2, "capas_por_cara": 1, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
  "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 3.00], "orientacion": "vertical" },
  "aberturas": [
    { "tipo": "puerta", "ancho_m": 0.90, "alto_m": 2.10, "distancia_desde_inicio_m": 1.00 }
  ],
  "encuentros": []
}
```
Nota: se eligió formato de placa 1.20x3.00 (en vez de 2.40) a propósito — decisión típica de obra para mantener orientación vertical de 1 hilada cuando el muro supera 2.40m, evitando juntas horizontales. La placa se corta en altura (sobra 0.40m que se descarta), pero sigue consumiendo 1 unidad comercial por columna.

**Derivación clave**
- Vano ocupa x en [1.00, 1.90], y en [0, 2.10]
- Columnas: [0,1.20], [1.20,2.40], [2.40,3.60], [3.60,4.20] → 4 columnas
- El vano interseca las columnas 0 y 1 (parcialmente) → 2 placas "con recorte", pero ninguna columna cae 100% dentro del vano (alto vano 2.10 < alto muro 2.60) → siguen contando 4 placas/cara
- Montantes base = ROUNDUP(4.20/0.40)+1 = 12; + 2 montantes de jamba doble (uno a cada lado del vano) = 14
- Riel: cielo completo 4.20m + piso interrumpido en el vano (4.20−0.90=3.30m) = 7.50m → ROUNDUP(7.50/3.00) = 3 barras (incluye margen para el refuerzo de dintel de 1.20m)
- Área neta = (4.20×2.60) − (0.90×2.10) = 9.03 m²
- Junta vertical en x=1.20 cae dentro del vano → solo cuenta el tramo por encima del vano: 2.60−2.10 = 0.50m. Las otras 2 juntas (x=2.40, x=3.60) están fuera del vano → 2.60m completas c/u
- ML juntas verticales/cara = 0.50 + 2.60 + 2.60 = 5.70 → ambas caras = 11.40 ml

**Output esperado**
```json
{
  "placas": { "cantidad_total": 8 },
  "perfiles": { "montantes": 14, "rieles_barras": 3, "montantes_refuerzo_vanos": 2 },
  "tornillos": { "placa_perfil": 452, "perfil_perfil": 56, "anclajes_losa": 18 },
  "cinta": { "ml_total": 11.97, "rollos": 1 },
  "masilla": { "kg_total": 10.26, "bolsas": 1 },
  "aislante": { "m2": 9.03, "paquetes": 1 },
  "esquineros": { "ml_total": 0 },
  "trazabilidad": [
    "Montantes: ROUNDUP(4.20/0.40)+1=12, +2 por jambas dobles de puerta = 14",
    "Placas: 4 columnas x 2 caras x 1 capa = 8 (ninguna columna cae 100% dentro del vano)",
    "Junta en x=1.20 recortada por el vano: solo 0.50m (por encima del dintel) en vez de 2.60m",
    "Juntas verticales totales: (0.50+2.60+2.60) x 2 caras = 11.40 ml",
    "Area neta: 10.92 - 1.89 (vano) = 9.03 m2",
    "Tornillos placa-perfil: 9.03 x 2 caras x 25/m2 = 451.5 -> 452",
    "Tornillos perfil-perfil: 14 montantes x 2 uniones x 2 = 56",
    "Anclajes losa: techo 4.20m (9) + piso en 2 tramos 1.00m (3) y 2.30m (6) = 18",
    "Aislante: 9.03 m2 / 12 = 1 paquete"
  ]
}
```

---

## Caso C — Dos muros con encuentro en esquina externa (90°)

**Input**
```json
{
  "muros": [
    {
      "id": "muro_C1",
      "geometria": { "largo_m": 3.00, "alto_m": 2.40 },
      "sistema": { "estructura": "simple", "caras": 2, "capas_por_cara": 1, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
      "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
      "aberturas": [], "encuentros": ["union_C"]
    },
    {
      "id": "muro_C2",
      "geometria": { "largo_m": 2.50, "alto_m": 2.40 },
      "sistema": { "estructura": "simple", "caras": 2, "capas_por_cara": 1, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
      "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
      "aberturas": [], "encuentros": ["union_C"]
    }
  ],
  "uniones": [
    { "id": "union_C", "muros_conectados": ["muro_C1", "muro_C2"], "angulo_grados": 90, "tipo_union": "esquina_externa_simple",
      "config_modulacion": { "resetear_perfiles": true, "perfiles_simetricos": false } }
  ]
}
```

**Derivación clave**
- Montantes muro_C1 = ROUNDUP(3.00/0.40)+1 = 9, + 1 perfil aportado por la unión (esquina) = 10
- Montantes muro_C2 = ROUNDUP(2.50/0.40)+1 = 8 (el perfil de esquina ya se contó en C1, no se duplica)
- Riel C1 = ROUNDUP(6.00/3.00) = 2 barras; Riel C2 = ROUNDUP(5.00/3.00) = 2 barras
- Placas C1: ROUNDUP(3.00/1.20)=3 columnas → 6 placas (2 caras); Placas C2: ROUNDUP(2.50/1.20)=3 columnas → 6 placas
- Esquinero metálico en la arista de la unión: ML = altura del muro en la arista = 2.40m

**Output esperado**
```json
{
  "placas": { "cantidad_total": 12 },
  "perfiles": { "montantes": 18, "rieles_barras": 4, "montantes_refuerzo_vanos": 0, "montantes_union": 1 },
  "tornillos": { "placa_perfil": 660, "perfil_perfil": 72, "anclajes_losa": 26 },
  "cinta": { "ml_total": 20.16, "rollos": 1 },
  "masilla": { "kg_total": 17.28, "bolsas": 1 },
  "aislante": { "m2": 13.20, "paquetes": 2 },
  "esquineros": { "ml_total": 2.40 },
  "trazabilidad": [
    "Montantes C1: ROUNDUP(3.00/0.40)+1=9, +1 por union en esquina = 10",
    "Montantes C2: ROUNDUP(2.50/0.40)+1=8 (perfil de esquina ya contado en C1)",
    "Placas: (3 + 3 columnas) x 2 caras = 12",
    "Juntas verticales: C1 2 internas x2.40x2caras=9.60ml; C2 2 internas x2.40x2caras=9.60ml; total 19.20ml",
    "Esquinero: 2.40 ml (altura de la arista compartida)",
    "Aislante: (7.20+6.00) m2 / 12 = ROUNDUP(1.10) = 2 paquetes"
  ]
}
```

---

## Caso D — Muro con doble capa por cara (desfase de juntas)

**Input**
```json
{
  "id": "muro_D",
  "geometria": { "largo_m": 3.60, "alto_m": 2.40 },
  "sistema": { "estructura": "simple", "caras": 2, "capas_por_cara": 2, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
  "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
  "aberturas": [], "encuentros": []
}
```

**Derivación clave**
- Montantes = ROUNDUP(3.60/0.40)+1 = 10 (no cambia por tener 2 capas — las capas solo afectan placas/juntas/tornillos placa-perfil)
- Capa 1: 3.60/1.20 = 3.0 exacto → 3 columnas, joints en x=1.20 y x=2.40
- Capa 2: desfase 0.30m → n_columnas = ROUNDUP((3.60+0.30)/1.20) = 4, joints en x=0.90, 2.10, 3.30 (ninguno coincide con los de la capa 1)
- Placas: capa1 = 3/cara, capa2 = 4/cara → 7/cara × 2 caras = 14
- ML juntas: capa1 = 2×2.40=4.80/cara; capa2 = 3×2.40=7.20/cara → 12.00/cara × 2 caras = 24.00 ml

**Output esperado**
```json
{
  "placas": { "cantidad_total": 14 },
  "perfiles": { "montantes": 10, "rieles_barras": 3, "montantes_refuerzo_vanos": 0 },
  "tornillos": { "placa_perfil": 864, "perfil_perfil": 40, "anclajes_losa": 18 },
  "cinta": { "ml_total": 25.20, "rollos": 1 },
  "masilla": { "kg_total": 21.60, "bolsas": 1 },
  "aislante": { "m2": 8.64, "paquetes": 1 },
  "esquineros": { "ml_total": 0 },
  "trazabilidad": [
    "Montantes: ROUNDUP(3.60/0.40)+1 = 10 (independiente del numero de capas)",
    "Placas capa 1: 3 columnas x 2 caras = 6; capa 2 (desfasada 0.30m): 4 columnas x 2 caras = 8; total 14",
    "Juntas capa1: 2 internas x2.40 = 4.80/cara; capa2: 3 internas x2.40=7.20/cara; total (4.80+7.20)x2caras=24.00ml",
    "Tornillos placa-perfil: area neta 8.64 x 2 caras x 2 capas x 25/m2 = 864",
    "Tornillos perfil-perfil: 10 montantes x 2 uniones x 2 = 40 (no se duplica por capa)"
  ]
}
```

---

## Caso F — Encuentro en T con 3 muros

**Input**
```json
{
  "proyecto": "Caso F - Encuentro en T",
  "catalogo": "generico_estandar",
  "elementos": [
    {
      "id": "muro_F1",
      "geometria": { "largo_m": 3.00, "alto_m": 2.40 },
      "sistema": { "estructura": "simple", "caras": 2, "capas_por_cara": 1, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
      "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
      "aberturas": [],
      "encuentros": ["union_F"]
    },
    {
      "id": "muro_F2",
      "geometria": { "largo_m": 2.50, "alto_m": 2.40 },
      "sistema": { "estructura": "simple", "caras": 2, "capas_por_cara": 1, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
      "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
      "aberturas": [],
      "encuentros": ["union_F"]
    },
    {
      "id": "muro_F3",
      "geometria": { "largo_m": 2.00, "alto_m": 2.40 },
      "sistema": { "estructura": "simple", "caras": 2, "capas_por_cara": 1, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
      "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
      "aberturas": [],
      "encuentros": ["union_F"]
    }
  ],
  "uniones": [
    {
      "id": "union_F",
      "muros_conectados": ["muro_F1", "muro_F2", "muro_F3"],
      "angulo_grados": 90,
      "tipo_union": "encuentro_T_simple",
      "config_modulacion": { "resetear_perfiles": true, "perfiles_simetricos": false }
    }
  ]
}
```

**Derivación clave**
- **Placas**:
  - F1: 3 columnas x 2 caras = 6 placas
  - F2: 3 columnas x 2 caras = 6 placas
  - F3: 2 columnas x 2 caras = 4 placas
  - Total placas = 16
- **Montantes**:
  - F1 (primero alfabéticamente): 9 base + 1 unión = 10 montantes
  - F2: 8 base + 0 unión = 8 montantes
  - F3: 6 base + 0 unión = 6 montantes
  - Total montantes = 24
- **Rieles**:
  - F1: ceil 3.00 + floor 3.00 = 6.00m → 2 barras de 3m
  - F2: ceil 2.50 + floor 2.50 = 5.00m → 2 barras de 3m
  - F3: ceil 2.00 + floor 2.00 = 4.00m → 2 barras de 3m
  - Total rieles = 6 barras
- **Juntas**:
  - F1: 2 juntas x 2.40m x 2 caras = 9.60 ml. Con traslape (1.05) = 10.08 ml
  - F2: 2 juntas x 2.40m x 2 caras = 9.60 ml. Con traslape (1.05) = 10.08 ml
  - F3: 1 junta x 2.40m x 2 caras = 4.80 ml. Con traslape (1.05) = 5.04 ml
  - Total joints ml = 24.00 ml. Con traslape = 25.20 ml → 1 rollo
- **Masilla**: 24.00 ml x 0.3 x 3 = 21.60 kg → 1 bolsa
- **Aislante**: area neta total = 7.20 + 6.00 + 4.80 = 18.00 m² → 2 paquetes
- **Tornillos**:
  - Placa-perfil: 18.00 m² x 2 caras x 1 capa x 25/m² = 900
  - Perfil-perfil: 24 montantes x 2 x 2 = 96
  - Anclajes losa: F1 (14) + F2 (12) + F3 (10) = 36
- **Esquineros**: 0 (acabado es cinta_papel para encuentro_T_simple)

**Output esperado**
```json
{
  "placas": { "cantidad_total": 16 },
  "perfiles": { "montantes": 24, "rieles_barras": 6, "montantes_refuerzo_vanos": 0, "montantes_union": 1 },
  "tornillos": { "placa_perfil": 900, "perfil_perfil": 96, "anclajes_losa": 36 },
  "cinta": { "ml_total": 25.20, "rollos": 1 },
  "masilla": { "kg_total": 21.60, "bolsas": 1 },
  "aislante": { "m2": 18.00, "paquetes": 2 },
  "esquineros": { "ml_total": 0 }
}
```

---

## Caso G — Estructura doble

**Input**
```json
{
  "id": "muro_G",
  "geometria": { "largo_m": 4.00, "alto_m": 2.40 },
  "sistema": { "estructura": "doble", "caras": 2, "capas_por_cara": 1, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
  "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
  "aberturas": [],
  "encuentros": []
}
```

**Derivación clave**
- **Placas**: 4 columnas x 2 caras x 1 capa = 8 placas (no se duplica por estructura doble)
- **Montantes**: (ROUNDUP(4.00/0.40)+1 = 11) x 2 líneas de estructura = 22 montantes
- **Rieles**: (ceil 4.00 + floor 4.00 = 8.00m → 3 barras de 3m) x 2 líneas = 6 barras
- **Juntas**: 3 juntas x 2.40m x 2 caras = 14.40 ml (no se duplica). Con traslape (1.05) = 15.12 ml → 1 rollo
- **Masilla**: 14.40 ml x 0.3 x 3 = 12.96 kg → 1 bolsa
- **Aislante**: area neta = 4.00 x 2.40 = 9.60 m² (no se duplica) → 1 paquete
- **Tornillos**:
  - Placa-perfil: 9.60 m² x 2 caras x 25/m² = 480
  - Perfil-perfil: 22 montantes x 2 uniones x 2 = 88
  - Anclajes losa: (techo 9 + piso 9 = 18) x 2 líneas = 36
- **Esquineros**: 0

**Output esperado**
```json
{
  "placas": { "cantidad_total": 8 },
  "perfiles": { "montantes": 22, "rieles_barras": 6, "montantes_refuerzo_vanos": 0 },
  "tornillos": { "placa_perfil": 480, "perfil_perfil": 88, "anclajes_losa": 36 },
  "cinta": { "ml_total": 15.12, "rollos": 1 },
  "masilla": { "kg_total": 12.96, "bolsas": 1 },
  "aislante": { "m2": 9.60, "paquetes": 1 },
  "esquineros": { "ml_total": 0 }
}
```

---

## Caso H — Muro alto con empalme de montante

**Input**
```json
{
  "id": "muro_H",
  "geometria": { "largo_m": 3.60, "alto_m": 3.20 },
  "sistema": { "estructura": "simple", "caras": 2, "capas_por_cara": 1, "perfil": "M48", "riel": "R48", "separacion_montante_m": 0.40 },
  "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
  "aberturas": [],
  "encuentros": []
}
```

**Derivación clave**
- **Placas**: 3 columnas x 2 caras x 1 capa = 6 placas (con alto 3.20m en la grilla virtual, cortadas de placas de 2.40m)
- **Montantes**:
  - Verticales base: (ROUNDUP(3.60/0.40)+1) = 10 posiciones de montante vertical.
  - Al ser `alto_m = 3.20m` mayor que `largo_barra_m = 3.00m` del catálogo, se requiere empalme en cada montante.
  - Cada posición de montante necesita comprar barras enteras para cubrir la altura de 3.20m con un traslape de 0.30m.
  - Barras por posición = CEIL((3.20 - 0.30) / (3.00 - 0.30)) = 2 barras.
  - Barras totales de montante = 10 posiciones x 2 barras/posición = 20 barras de 3.00m.
- **Rieles**: (ceil 3.60 + floor 3.60 = 7.20m) → 3 barras
- **Juntas**: 2 juntas x 3.20m x 2 caras = 12.80 ml. Con traslape (1.05) = 13.44 ml → 1 rollo
- **Masilla**: 12.80 ml x 0.3 x 3 = 11.52 kg → 1 bolsa
- **Aislante**: area neta = 3.60 x 3.20 = 11.52 m² → 1 paquete (cada uno de 12 m²)
- **Tornillos**:
  - Placa-perfil: 11.52 m² x 2 caras x 25/m² = 576
  - Perfil-perfil: 20 barras x 2 uniones x 2 = 80
  - Anclajes losa: (techo 9 + piso 9 = 18) = 18
- **Esquineros**: 0

**Output esperado**
```json
{
  "placas": { "cantidad_total": 6, "peso_total_kg": 218.88 },
  "perfiles": { "montantes": 20, "rieles_barras": 3, "montantes_refuerzo_vanos": 0 },
  "tornillos": { "placa_perfil": 576, "perfil_perfil": 80, "anclajes_losa": 18 },
  "cinta": { "ml_total": 13.44, "rollos": 1 },
  "masilla": { "kg_total": 11.52, "bolsas": 1 },
  "aislante": { "m2": 11.52, "paquetes": 1 },
  "esquineros": { "ml_total": 0 }
}
```

---

## Casos pendientes de agregar (no calculados todavía)

Estos quedan identificados para sumar al banco a medida que se programen las funciones correspondientes — no bloquean el arranque del desarrollo de los Casos A-D, pero conviene no perderlos de vista:

- **Unión en ángulo no ortogonal** (ej. 60°, como el ejemplo de la interfaz de Pladur): valida el corte a inglete en perfiles y el comportamiento de la modulación cuando el origen de grilla no es perpendicular.
- **Zona húmeda con placa RH**: valida el cambio de catálogo de placa y su impacto en peso/tornillos.
- **Cielorraso suspendido**: sistema de perfiles completamente distinto (maestras, perfiles F47), primer caso de un tipo de elemento que no es "muro".
- **Reuso de offcuts** (Fase 4): mismo Caso B, pero verificando si el recorte de la columna 0 (con vano) puede reutilizarse en otra parte del mismo muro antes de contarlo como desperdicio.

