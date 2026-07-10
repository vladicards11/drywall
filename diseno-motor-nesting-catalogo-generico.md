# Diseño técnico — Catálogo genérico + Algoritmo de modulación (nesting)

Complemento del documento de planificación general. Acá se define en detalle lo necesario para arrancar el MVP con **catálogo genérico (sin marca)** y **modulación real de placas (nesting)** desde el día uno.

---

## 1. Catálogo genérico de materiales (JSON de configuración)

La idea de "genérico" no significa "sin datos técnicos", sino que los valores son **parámetros de sistema constructivo estándar** (los que comparten la mayoría de fabricantes), editables por el usuario/administrador sin tocar código. Esto además te deja el camino abierto para que en el futuro cada fabricante sea simplemente otro archivo de este mismo formato.

```json
{
  "sistema": "generico_estandar",
  "perfiles": {
    "montante": [
      { "codigo": "M35", "ancho_mm": 35, "largo_barra_m": 3.00, "peso_kg_ml": 0.45 },
      { "codigo": "M48", "ancho_mm": 48, "largo_barra_m": 3.00, "peso_kg_ml": 0.52 },
      { "codigo": "M70", "ancho_mm": 70, "largo_barra_m": 3.00, "peso_kg_ml": 0.68 },
      { "codigo": "M90", "ancho_mm": 90, "largo_barra_m": 3.00, "peso_kg_ml": 0.81 }
    ],
    "riel": [
      { "codigo": "R35", "ancho_mm": 35, "largo_barra_m": 3.00, "peso_kg_ml": 0.42 },
      { "codigo": "R48", "ancho_mm": 48, "largo_barra_m": 3.00, "peso_kg_ml": 0.49 },
      { "codigo": "R70", "ancho_mm": 70, "largo_barra_m": 3.00, "peso_kg_ml": 0.63 },
      { "codigo": "R90", "ancho_mm": 90, "largo_barra_m": 3.00, "peso_kg_ml": 0.75 }
    ],
    "separacion_montante_m_default": 0.40,
    "separaciones_permitidas_m": [0.40, 0.41, 0.60]
  },
  "placas": [
    { "tipo": "ST", "nombre": "Estandar", "espesor_mm": 12.5, "formatos_m": [[1.20, 2.40], [1.20, 3.00], [1.20, 2.60]], "peso_kg_m2": 9.5 },
    { "tipo": "RH", "nombre": "Resistente humedad", "espesor_mm": 12.5, "formatos_m": [[1.20, 2.40], [1.20, 3.00]], "peso_kg_m2": 9.8 },
    { "tipo": "RF", "nombre": "Resistente fuego", "espesor_mm": 15.0, "formatos_m": [[1.20, 2.40], [1.20, 3.00]], "peso_kg_m2": 11.6 }
  ],
  "tornillos": {
    "placa_perfil_por_m2": { "9.5mm": 22, "12.5mm": 25, "15mm": 28 },
    "perfil_perfil_por_union": 2,
    "anclaje_losa_separacion_m": 0.50
  },
  "cinta": {
    "rendimiento_ml_por_rollo": 30,
    "factor_traslape": 1.05,
    "cantonera_incluida_en_esquinas_externas": true
  },
  "masilla": {
    "kg_por_ml_por_mano": 0.30,
    "manos_estandar": 3,
    "presentacion_kg_por_bolsa": 25
  },
  "aislante": {
    "tipos": ["lana_vidrio", "lana_mineral", "poliester"],
    "espesores_mm_recomendados_por_ancho_perfil": { "35": 35, "48": 50, "70": 70, "90": 90 },
    "presentacion_m2_por_paquete": 12
  },
  "factor_desperdicio_placas_default": 0.08,
  "desfase_junta_vertical_min_m": 0.30
}
```

Este archivo es la **única fuente de verdad numérica**. El motor de cálculo nunca debe tener un número suelto en el código — todo sale de acá. Si mañana cargás un catálogo "Pladur" o "Knauf", el mismo motor funciona sin cambios.

---

## 1.1 Catálogo de tipologías de unión (encuentros entre muros)

Los encuentros entre muros (esquinas, T, cruces) no se modelan como un atributo suelto de cada muro, sino como su propia entidad de catálogo — igual que placas o perfiles. Cada tipología define cuántos perfiles adicionales suma, si la placa corta a tope o envuelve el encuentro, y el tratamiento de acabado (cinta de papel vs. cinta metálica/esquinero). Esto permite reproducir el comportamiento de catálogos como el de Pladur (tipologías 1.1-1, 1.1-2, 1.3-1, 1.3-2, 1.5, etc.), donde cada combinación de estructura simple/doble y cantidad de muros que llegan al nodo tiene su propia regla.

```json
"tipologias_union": [
  {
    "codigo": "1.1-1",
    "descripcion": "Union simple a 90 grados, estructura simple, placa a tope",
    "n_muros_soportados": 2,
    "perfiles_adicionales": 1,
    "tratamiento_placa": "a_tope",
    "acabado": "cinta_papel"
  },
  {
    "codigo": "1.3-2",
    "descripcion": "Union en T, estructura doble, placa envolvente en una de las caras",
    "n_muros_soportados": 3,
    "perfiles_adicionales": 2,
    "tratamiento_placa": "envolvente",
    "acabado": "esquinero_metalico"
  }
]
```
El ángulo de encuentro **no se asume fijo en 90°** — el catálogo Pladur permite sobreescribirlo (ej. 60°), y eso implica que la tipología debe poder aplicar corte a inglete en los perfiles cuando el ángulo no es recto. Este dato vive en la unión concreta del proyecto (sección 1.2), no en la tipología del catálogo, que es agnóstica al ángulo exacto.

## 1.2 El proyecto como grafo (muros = aristas, uniones = nodos)

En vez de que cada muro cargue su propio atributo `encuentros`, el proyecto pasa a modelarse como un grafo: los **muros son aristas** (con su geometría y sistema, igual que antes) y las **uniones son nodos** independientes que conectan 2 o más muros.

```json
"uniones": [
  {
    "id": "union_01",
    "muros_conectados": ["muro_01", "muro_02"],
    "angulo_grados": 90,
    "tipo_union": "1.1-1",
    "config_modulacion": {
      "resetear_perfiles": true,
      "perfiles_simetricos": false
    }
  }
]
```

`config_modulacion` controla el punto de origen de la grilla de montantes/placas de cada muro que llega al nodo (Paso 2 del algoritmo de nesting, sección 3.1):
- `resetear_perfiles: true` → la grilla de ese muro arranca de cero en la unión, en vez de continuar la separación de montantes del muro anterior.
- `perfiles_simetricos: true` → la grilla se centra en el muro (recorte repartido en ambos extremos) en vez de arrancar siempre desde el extremo izquierdo/inicial.

Esto no reemplaza el algoritmo de modulación ya diseñado: solo hace que el "origen" de la grilla (`x_inicio = 0` en el Paso 2) sea un parámetro que viene de la unión correspondiente, en vez de estar fijo.

## 2. Modelo de datos del proyecto

```json
{
  "proyecto": "Vivienda unifamiliar - Planta baja",
  "catalogo": "generico_estandar",
  "elementos": [
    {
      "id": "muro_01",
      "tipo": "tabique",
      "geometria": { "largo_m": 4.20, "alto_m": 2.60 },
      "sistema": {
        "estructura": "simple",
        "caras": 2,
        "capas_por_cara": 1,
        "perfil": "M48",
        "riel": "R48",
        "separacion_montante_m": 0.40
      },
      "placa": { "tipo": "ST", "espesor_mm": 12.5, "formato_m": [1.20, 2.40], "orientacion": "vertical" },
      "aislante": { "tipo": "lana_vidrio", "espesor_mm": 50 },
      "aberturas": [
        { "tipo": "puerta", "ancho_m": 0.90, "alto_m": 2.10, "distancia_desde_inicio_m": 1.00 }
      ],
      "encuentros": [
        { "tipo": "esquina_externa", "posicion": "inicio" },
        { "tipo": "encuentro_T", "posicion": "fin" }
      ]
    }
  ]
}
```

`elementos` es una lista — un proyecto real son muchos muros/cielorrasos, cada uno con esta misma estructura. Los `encuentros` conectan lógicamente con muros vecinos (para no duplicar montantes en un cruce compartido, si más adelante querés modelar el proyecto como planta completa en vez de muros aislados).

---

## 3. Algoritmo de modulación (nesting) — diseño

Importante entender esto antes de programar: la modulación de placas de drywall **no es un problema de optimización libre** (como el "cutting stock problem" clásico, que es NP-difícil). En obra real se sigue un **patrón determinístico de colocación tipo aparejo de ladrillo**, así que el algoritmo es una simulación de reglas, no una búsqueda de óptimos — esto lo hace mucho más simple y 100% predecible, que es justo lo que necesitás para que el cálculo sea auditable.

### 3.1 Pasos del algoritmo

**Paso 1 — Determinar orientación de placa**
```
si alto_muro <= altura_placa_formato:
    orientacion = vertical   (una sola hilada, placas de pie)
sino:
    orientacion = horizontal (varias hiladas apiladas)
```

**Paso 2 — Generar grilla base de placas**
Para orientación vertical (caso más común en tabiques de altura estándar 2.40-2.60m):
```
n_columnas = ROUNDUP(largo_muro / ancho_placa)
para cada columna i en 0..n_columnas:
    x_inicio = i * ancho_placa
    x_fin = min(x_inicio + ancho_placa, largo_muro)
    crear_placa(x_inicio, 0, x_fin, alto_muro)
```

Para orientación horizontal (muros más altos que el formato de placa):
```
n_hiladas = ROUNDUP(alto_muro / alto_placa)
para cada hilada j en 0..n_hiladas:
    y_inicio = j * alto_placa
    y_fin = min(y_inicio + alto_placa, alto_muro)
    desfase_x = (j % 2 == 1) ? ancho_placa / 2 : 0   // patrón de aparejo
    n_columnas = ROUNDUP((largo_muro + desfase_x) / ancho_placa)
    para cada columna i:
        x_inicio = i * ancho_placa - desfase_x
        x_fin = min(x_inicio + ancho_placa, largo_muro)
        crear_placa(max(x_inicio,0), y_inicio, x_fin, y_fin)
```
El `desfase_x` alternado por hilada es lo que garantiza que las juntas verticales no queden alineadas entre hiladas — esto es una exigencia técnica real (evita que la fisura por junta se propague en línea recta).

**Paso 3 — Restar aberturas**
```
para cada placa generada:
    para cada abertura del muro:
        si la placa intersecta la abertura:
            recalcular el polígono útil de la placa (rectángulo - intersección)
            marcar la placa como "con recorte"
            registrar el recorte como offcut disponible (para v2: intentar reusar el offcut en otra placa "con recorte" cercana antes de contarlo como desperdicio)
```
Regla de conteo: una placa con recorte **sigue consumiendo 1 unidad comercial completa**, salvo que el offcut se reutilice explícitamente en otro punto del mismo muro (optimización de v2). Si la intersección cubre el 100% de la placa (placa cae completamente dentro del vano), se descarta y no cuenta.

**Paso 4 — Extraer juntas reales**
```
juntas_verticales = todos los bordes compartidos entre placas adyacentes en la misma hilada
juntas_horizontales = todos los bordes compartidos entre hiladas
para cada junta:
    recortar el segmento que caiga dentro de una abertura (ahí no hay junta que tratar)
ML_total_juntas = Σ longitud de cada segmento de junta resultante
```
Este valor —y no una fórmula de área— es el que alimenta el cálculo de cinta y masilla (sección 3.7 del documento anterior), dándote la precisión real de obra.

**Paso 5 — Repetir para cada capa y cada cara**
Si `capas_por_cara > 1`, se corre el mismo algoritmo por capa, pero la capa 2 debe generarse con un desfase adicional respecto a la capa 1 (`desfase_junta_vertical_min_m` del catálogo) para que las juntas de ambas capas no coincidan — regla técnica estándar en sistemas de dos placas.

**Paso 6 — Consolidar resultado**
```
placas_totales = Σ placas por cara x capas x caras
ML_juntas_totales = Σ ML de juntas por cara x capas
cinta_necesaria = ML_juntas_totales x factor_traslape
masilla_kg = ML_juntas_totales x kg_por_ml_por_mano x manos_estandar
```

### 3.2 Complejidad y rendimiento

Este algoritmo es **O(n_placas x n_aberturas)** por muro — trivial computacionalmente incluso para proyectos grandes (miles de placas). No hace falta ningún solver de optimización pesado; es geometría rectangular simple (intersección de rectángulos), perfectamente factible en el navegador sin backend.

### 3.3 Representación visual (para v2/v3)

Como el algoritmo ya produce la posición (x,y,ancho,alto) de cada placa, es trivial renderizarlo en un `<canvas>` o SVG como grilla de rectángulos — es literalmente el mismo dato que necesita el editor visual del muro. Conviene diseñar el motor pensando en esto desde el principio, aunque el MVP no tenga UI gráfica todavía: que la función de cálculo devuelva **la lista de placas con sus coordenadas**, no solo un número total. Así el "detalle" visual sale gratis más adelante.

---

## 4. Estructura de salida del motor (contrato de datos)

```json
{
  "muro_id": "muro_01",
  "placas": {
    "cantidad_total": 8,
    "detalle": [
      { "id": "p1", "x": 0, "y": 0, "ancho": 1.20, "alto": 2.40, "cara": "A", "capa": 1, "recortada": false },
      { "id": "p2", "x": 1.20, "y": 0, "ancho": 1.20, "alto": 2.40, "cara": "A", "capa": 1, "recortada": true }
    ]
  },
  "perfiles": { "montantes": 12, "rieles_barras": 3, "montantes_refuerzo_vanos": 2 },
  "tornillos": { "placa_perfil": 210, "perfil_perfil": 24, "anclajes_losa": 9 },
  "cinta": { "ml_total": 34.4, "rollos": 2 },
  "masilla": { "kg_total": 30.96, "bolsas": 2 },
  "aislante": { "m2": 10.5, "paquetes": 1 },
  "esquineros": { "ml_total": 2.60 },
  "trazabilidad": [
    "Montantes: 4.20m / 0.40m + 1 = 11.5 → 12, +1 por esquina externa, +2 por jambas de puerta = 15",
    "Placas: modulación vertical, 4 placas por hilera x 2 caras = 8"
  ]
}
```
El array `trazabilidad` es opcional pero muy recomendable: cada línea explica cómo se llegó a un número, para que el resultado sea auditable por el usuario (y para debug tuyo durante el desarrollo).

---

## 5. Siguiente paso concreto

Con esto ya hay suficiente para empezar a programar el core. El orden lógico de implementación sería:

1. Función `generarGrillaPlacas(muro)` → lista de rectángulos (Paso 1-2)
2. Función `aplicarAberturas(placas, aberturas)` → recorte + conteo (Paso 3)
3. Función `extraerJuntas(placas)` → lista de segmentos (Paso 4)
4. Función `calcularPerfiles(muro)` → independiente, con reglas de la tabla de casuística
5. Función `calcularTornilleria/Cinta/Masilla/Aislante(resultadosAnteriores, catalogo)` → consume los resultados 1-4
6. Función orquestadora `calcularMuro(muro, catalogo)` que llama a todo en orden y arma el JSON de salida

¿Querés que prototipe esto en código ahora (TypeScript o Python, la función de modulación + cálculo de un muro simple con puerta, para validarlo con un caso de prueba concreto)?
