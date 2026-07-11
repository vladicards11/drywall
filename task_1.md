# 📋 Checklist Detallado de Tareas — Fases 6, 7 y 8

Este es el listado de tareas operativas para guiar el desarrollo paso a paso del plan de expansión, asegurando que cada parámetro de cálculo geométrico y de negocio se implemente correctamente.

---

## 🪵 FASE 6 — Cielorrasos y Volumetría Especial (Sistemas Horizontales)

### Épica 30 — Motor de Cálculo de Cielorrasos Planos
- [x] **30.1** Definición de tipos y Zod Schemas en `@drywall-calc/catalog-schemas`:
  - [x] Crear interfaces para perfiles de cielorraso en `catalogoSchema.ts` (portantes, omega, conectores, colgadores, perfiles perimetrales angulares).
  - [x] Definir el tipo `CielorrasoInput` (geometría de planta x/y, altura de suspensión, tipo de estructura: directa-omega o bidireccional-suspendida, modulación).
- [x] **30.2** Algoritmo de distribución geométrica unidireccional (Omega):
  - [x] Implementar la modulación de perfiles omega paralelos a una directriz seleccionada cada $0.407\text{ m}$ o $0.50\text{ m}$.
  - [x] Aplicar la regla de primer/último perfil a una distancia máxima de borde de $0.30\text{ m}$.
  - [x] Calcular conectores de unión lineal de perfiles según el largo comercial de la barra omega ($3.00\text{ m}$).
- [x] **30.3** Algoritmo de distribución bidireccional suspendida (Doble Nivel):
  - [x] Calcular la red de perfiles principales/portantes (separados cada $0.90\text{ m}$ a $1.20\text{ m}$).
  - [x] Calcular la red de perfiles secundarios cruzados (separados cada $0.407\text{ m}$ o $0.50\text{ m}$).
  - [x] Calcular conectores de anclaje rápido entre perfiles principales y secundarios.
  - [x] Calcular la densidad geométrica de varillas/colgadores de suspensión fijados a losa superior (cada $1.20\text{ m}$ sobre los perfiles principales, respetando la regla de bordes a $0.30\text{ m}$).
- [x] **30.4** Cálculo de perfiles angulares perimetrales:
  - [x] Medir el perímetro del cielorraso y calcular la cantidad de perfiles perimetrales ($3.00\text{ m}$ c/u) con redondeo superior.
  - [x] Calcular tarugos de fijación y tornillos perimetrales cada $0.60\text{ m}$ de perímetro.
- [x] **30.5** Integrar orquestador de cielorrasos:
  - [x] Implementar `calcularCielorraso()` que devuelva el listado de materiales y la trazabilidad de cálculo.
  - [x] Escribir tests de regresión unitarios con un Caso de Techo Simple ($4.00\text{ m} \times 4.00\text{ m}$).

### Épica 31 — Cenefas, Cajones de Luz e Hornacinas
- [x] **31.1** Estructura de Cenefas (cajones suspendidos):
  - [x] Crear el modelo de datos de cenefa (recorrido lineal, altura del cajón, ancho del cajón, tipo de placa de terminación).
  - [x] Implementar cálculo de rieles superiores y parantes de cuelgue vertical (parantes cada $0.40\text{ m}$).
  - [x] Calcular cantoneras (esquineros perimetrales) para las aristas salientes del cajón.
- [x] **31.2** Estructura de Hornacinas (nichos internos en muros):
  - [x] Modificar el algoritmo de corte de placas para restar el vano del nicho.
  - [x] Calcular perfiles de refuerzo internos de esquina (rieles de soporte y parantes de marco) para dar solidez estructural a los bordes del nicho.
  - [x] Calcular esquineros metálicos para las esquinas del nicho.

### Épica 32 — Visualizador 3D y Controles de Cielorrasos
- [x] **32.1** Extender el visualizador 3D en `@drywall-calc/bim-viewer` (Three.js):
  - [x] Crear componentes visuales para renderizar la malla de perfiles principales y secundarios cruzados.
  - [x] Dibujar colgadores representados como líneas o cilindros finos extendiéndose desde el perfil hasta la losa teórica superior.
- [x] **32.2** Interfaz de edición:
  - [x] Crear botón de modo "Agregar Cielorraso" y permitir dibujar un área poligonal sobre el plano 2D.
  - [x] Formulario lateral para editar tipo de suspensión (directo vs suspendido) y modulación de ejes.

---

## 📐 FASE 7 — Optimización Avanzada de Despiece (Nesting 1D/2D)

### Épica 33 — Algoritmo de Nesting 1D de Perfiles Metálicos
- [x] **33.1** Implementación del solucionador matemático en `core-engine`:
  - [x] Diseñar el algoritmo de empaquetamiento unidimensional (*1D Bin Packing*) usando heurísticas de optimización (ej. *First Fit Decreasing* / *Best Fit Decreasing*).
  - [x] Recibir el array de demandas de perfiles con sus longitudes específicas y el stock comercial disponible (barras de $3.00\text{ m}$ u otras medidas del catálogo).
- [x] **33.2** Lógica de empalme sismorresistente para muros altos:
  - [x] Validar si la altura del muro supera el largo comercial.
  - [x] Calcular la junta telescópica (sumar $0.30\text{ m}$ de traslape en perfiles $0.45\text{ mm}$ o $0.45\text{ m}$ en perfiles $0.90\text{ mm}$ en la demanda de barras).
  - [x] Calcular los tornillos wafer de fijación adicionales por cada empalme (4 tornillos por cara de contacto).
- [x] **33.3** Generación de instrucciones de corte:
  - [x] Estructurar la salida del algoritmo para indicar a qué barra corresponde cada tramo cortado.
  - [x] Calcular el porcentaje de desperdicio remanente neto por barra.

### Épica 34 — Algoritmo de Nesting 2D Real de Placas y Reutilización
- [x] **34.1** Implementar algoritmo de empaquetamiento bidimensional rectangular (*2D Nesting*):
  - [x] Diseñar lógica de corte tipo guillotina para paneles de placas ($1.22\text{ m} \times 2.44\text{ m}$).
  - [x] Lógica de corte en "pistola" o L alrededor de puertas y ventanas para evitar juntas alineadas en los vertices del vano.
  - [x] Identificar retazos rectangulares sobrantes y guardarlos dinámicamente en una lista de material reutilizable para el mismo proyecto.
  - [x] Asignar los retazos a partes de muros más pequeños (ej. antepechos de ventanas o fajas de cenefa).
- [x] **34.2** Restricciones de dirección de fibra de placa:
  - [x] Validar que las placas de terminación se despiecen en el sentido de colocación (vertical u horizontal) definido, impidiendo rotaciones no deseadas que fragilicen el tabique.

### Épica 35 — Reporte de Planos de Corte
- [ ] **35.1** Renderizador SVG de planos de corte:
  - [ ] Crear un componente React que dibuje los rectángulos de las placas y perfiles comerciales y sombree las partes que se cortarán.
  - [ ] Agregar cotas lineales automáticas con las dimensiones exactas de corte.
- [ ] **35.2** Exportación:
  - [ ] Botón de descarga de "Guía de Taller" en formato PDF con la secuencia gráfica de cortes.

---

## 💼 FASE 8 — Presupuestos Avanzados, Logística y ERP de Obra

### Épica 36 — Módulo de APU (Análisis de Precios Unitarios)
- [ ] **36.1** Configuración de Base de Datos de Costos en LocalStorage/JSON:
  - [ ] Estructura para registrar costo unitario de materiales (perfiles, placas, tornillos, masilla).
  - [ ] Estructura de tarifas por hora de mano de obra (Operario, Oficial, Ayudante).
  - [ ] Configurar rendimientos estándar por metro cuadrado de instalación ($m^2/\text{día}$).
- [ ] **36.2** Motor de ajuste de rendimiento por complejidad y altura:
  - [ ] Aplicar factor de penalización de rendimiento en muros de altura $> 2.40\text{ m}$ (requiere andamios, rinde un 30% menos en altura).
  - [ ] Calcular automáticamente el costo de alquiler de andamios por día en base al metraje lineal y la altura.
  - [ ] Sumar materiales indirectos y de consumo rápido (cuchillas de cúter, brocas, clavos de impacto).
- [ ] **36.3** Generador de Presupuestos:
  - [ ] Pantalla de Resumen Económico: Costo Directo, Gastos Generales, Utilidad e Impuestos.
  - [ ] Exportación a plantilla comercial en PDF lista para enviar al cliente.

### Épica 37 — Logística de Despacho y Secuenciación por Fases
- [ ] **37.1** Algoritmo de desglose temporal de materiales por fase constructiva:
  - [ ] **Fase A (Estructuración)**: Consolidar rieles, parantes, clavos, fulminantes y tornillos wafer.
  - [ ] **Fase B (Emplacado Cara A)**: Consolidar el 50% de las placas de yeso o fibrocemento y tornillos de 1".
  - [ ] **Fase C (Instalaciones e Aislamiento)**: Agrupar lana de vidrio o lana de roca por área neta.
  - [ ] **Fase D (Emplacado Cara B / Cierre)**: Agrupar placas de cierre, tornillos de 1" y esquineros perimetrales.
  - [ ] **Fase E (Acabado/Masillado)**: Agrupar bolsas/baldes de masilla y rollos de cinta.
- [ ] **37.2** Interfaz de compras:
  - [ ] Generar orden de compra parcial o guía de despacho PDF por cada una de las fases anteriores para coordinar despachos sucesivos.

### Épica 38 — Control de Avance Físico Visual en Obra
- [ ] **38.1** Extender el visualizador 3D/2D para estado de obra:
  - [ ] Agregar propiedad `estado_constructivo` a los muros/cielorrasos en el modelo de datos (`Planificado` | `Estructurado` | `Cerrado Cara A` | `Aislado` | `Terminado`).
  - [ ] Colorear los muros en el visor 3D según su estado para un control visual intuitivo (ej: gris = estructurado, amarillo = aislado, verde = terminado).
- [ ] **38.2** Panel móvil de obra:
  - [ ] Diseñar vista móvil simplificada para que el capataz marque el avance con simples taps sobre la pantalla en obra.
  - [ ] Calcular el porcentaje de avance físico general y valorización económica del avance contra el presupuesto inicial de APU.
