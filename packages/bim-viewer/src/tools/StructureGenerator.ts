import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as FRAGS from '@thatopen/fragments';
import { BimWorld } from '../core/BimWorld.js';

export interface StructureOpening {
  x: number;
  y: number;
  w: number;
  h: number;
  tipo: 'puerta' | 'ventana' | 'pase';
}

export interface WallStructureParams {
  largo_m: number;
  alto_m: number;
  separacionParantes_m: number;
  espesorPerfil_m: number; // Ej: 0.089 para parante de 89mm
  aberturas: StructureOpening[];
  placas?: any[];
}

export interface CielorrasoStructureParams {
  largo_m: number;
  ancho_m: number;
  tipo_estructura: "omega" | "suspendido";
  separacion_secundario_m: number;
  separacion_principal_m?: number;
  distancia_cuelgue_m?: number;
  altura_suspension_m: number;
  espesorPerfil_m: number;
}

interface GeneratedElement {
  expressID: number;
  name: string;
  type: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrix: THREE.Matrix4;
  color?: THREE.Color;
  properties: {
    largo_m: number;
    alto_m: number;
    espesor_m: number;
  };
  category: 'placa' | 'estructura';
}

// Generador de geometría 3D de parante (Montante) en "C"
// Sistema: Z = Arriba (Altura), X = Largo del ala, Y = Profundidad del muro (Alma)
function crearGeometriaMontante(studWidth: number, studHeight: number, trackDepth: number): THREE.BufferGeometry {
  // 1. Salvaguarda de unidades: Asegurar que trackDepth sea metros (ej: 0.089)
  // Si recibimos 89 o 90, lo convertimos a 0.089
  let w = trackDepth > 1 ? trackDepth / 1000 : trackDepth; 
  let f = studWidth > 1 ? studWidth / 1000 : studWidth; // Ancho del ala (ej: 0.038)
  const t = 0.0025; // 2.5mm de espesor de chapa
  const lip = 0.008; // 8mm de labio

  // Dibujamos la "C" directamente en el plano X-Y (donde Y es el espesor del muro)
  // X = Ancho del Ala, Y = Profundidad del Alma, Z = Altura del perfil (extrusión)
  const shape = new THREE.Shape();
  // Punto de inicio (Esquina inferior izquierda exterior)
  shape.moveTo(-f/2, -w/2);
  // Base inferior (Ala inferior)
  shape.lineTo(f/2, -w/2);
  // Sube por la derecha (Alma derecha)
  shape.lineTo(f/2, w/2);
  // Base superior (Ala superior)
  shape.lineTo(-f/2, w/2);
  // Baja por la izquierda pero dejando el labio
  shape.lineTo(-f/2, w/2 - lip);
  // Labio interior superior
  shape.lineTo(-f/2 + t, w/2 - lip);
  // Alma interior
  shape.lineTo(-f/2 + t, -w/2 + lip);
  // Labio interior inferior
  shape.lineTo(-f/2, -w/2 + lip);
  // Cierra el shape
  shape.lineTo(-f/2, -w/2);

  const extrudeSettings = {
    depth: studHeight, // Se extruye hacia +Z (Arriba)
    bevelEnabled: false
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Rotamos para que la extrusión en Z apunte verticalmente en Y (Y-up)
  geo.rotateX(-Math.PI / 2);
  return geo;
}

// Generador de geometría 3D de riel (Canal) en "U"
// Sistema: X = Largo del muro, Y = Profundidad del muro, Z = Altura (espesor del riel)
function crearGeometriaRiel(largo: number, trackHeight: number, trackDepth: number): THREE.BufferGeometry {
  // 1. Salvaguarda de unidades
  let w = trackDepth > 1 ? trackDepth / 1000 : trackDepth; 
  let h = trackHeight > 1 ? trackHeight / 1000 : trackHeight;
  const t = 0.0025; // 2.5mm

  // Dibujamos en plano X-Y. 
  // X = Profundidad (w), Y = Altura del riel (h), Z = Largo del muro (extrusión)
  const shape = new THREE.Shape();
  shape.moveTo(-w/2, 0);
  shape.lineTo(w/2, 0);
  shape.lineTo(w/2, h);
  shape.lineTo(w/2 - t, h);
  shape.lineTo(w/2 - t, t);
  shape.lineTo(-w/2 + t, t);
  shape.lineTo(-w/2 + t, h);
  shape.lineTo(-w/2, h);
  shape.lineTo(-w/2, 0);

  const extrudeSettings = {
    depth: largo, // Se extruye hacia +Z
    bevelEnabled: false
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  // Rotamos para que el largo del riel quede en el eje X (largo del muro)
  // y la altura del riel quede en Z (vertical)
  geo.rotateY(Math.PI / 2); 
  // Esta única rotación mapea: Z->X, X->-Z. Dejando a Y intacto.
  return geo;
}

export class StructureGenerator {
  private bimWorld: BimWorld;
  private fragmentsGroup: FRAGS.FragmentsGroup | null = null;

  constructor(bimWorld: BimWorld) {
    this.bimWorld = bimWorld;
  }

  /**
   * Genera y renderiza en 3D la maqueta detallada de la estructura metálica (parantes, rieles) 
   * y las placas de yeso a partir de los datos calculados utilizando Fragmentos de ThatOpen.
   */
  generate(params: WallStructureParams) {
    this.clear();

    const { largo_m, alto_m, separacionParantes_m, espesorPerfil_m, aberturas, placas } = params;

    // Salvaguarda crítica para evitar bucles infinitos en el renderizado del cliente
    let step = separacionParantes_m;
    if (typeof step !== 'number' || isNaN(step) || step <= 0.05) {
      step = 0.40;
    }

    // Materiales sólidos y opacos para evitar la transparentación de la grilla del suelo
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Acero galvanizado clásico (Slate-400)
      metalness: 0.8,
      roughness: 0.25,
      transparent: false,
      side: THREE.DoubleSide
    });

    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Blanco yeso limpio (Slate-100)
      transparent: false,
      roughness: 0.9,
      side: THREE.DoubleSide
    });

    const openingBorderMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e, // Rosado/rojo para marcar refuerzos de aberturas
      metalness: 0.6,
      roughness: 0.3,
      transparent: false,
      side: THREE.DoubleSide
    });

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x475569, // Gris oscuro Slate-600 para líneas de borde CAD limpias
      linewidth: 1
    });

    let nextExpressID = 10000;
    const elements: GeneratedElement[] = [];
    const edgesToDraw: THREE.LineSegments[] = [];

    // Función auxiliar para registrar elementos y sus bordes CAD
    const addMetalMember = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      name = "Perfil Estructural",
      length = 3.0,
      depth = espesorPerfil_m,
      thickness = 0.04
    ) => {
      const matrix = new THREE.Matrix4().makeTranslation(x, y, z);
      const id = nextExpressID++;

      elements.push({
        expressID: id,
        name,
        type: 'IfcMember',
        geometry: geo,
        material: mat,
        matrix,
        properties: {
          largo_m: length,
          alto_m: thickness,
          espesor_m: depth
        },
        category: 'estructura'
      });

      // Agregar líneas de bordes
      const edges = new THREE.EdgesGeometry(geo);
      const lineSegments = new THREE.LineSegments(edges, edgeMaterial);
      lineSegments.position.set(x, y, z);
      lineSegments.userData = { type: 'estructura' };
      edgesToDraw.push(lineSegments);
    };

    // 1. Riel Inferior y Riel Superior (Perfiles canal U reales en plano X-Z con alas hacia +Y)
    const trackHeight = 0.04; // 4 cm de alto
    const trackDepth = espesorPerfil_m > 1 ? espesorPerfil_m / 1000 : espesorPerfil_m;

    const bottomTrackGeo = crearGeometriaRiel(largo_m, trackHeight, trackDepth);
    addMetalMember(bottomTrackGeo, metalMaterial, 0, 0, 0, "Riel Inferior (R)", largo_m, trackDepth, trackHeight);

    const topTrackGeo = crearGeometriaRiel(largo_m, trackHeight, trackDepth);
    addMetalMember(topTrackGeo, metalMaterial, 0, alto_m - trackHeight, 0, "Riel Superior (R)", largo_m, trackDepth, trackHeight);

    // 2. Parantes Verticales (Perfiles montantes C reales verticales en Y, con alma en Z y alas en X)
    const studWidth = 0.038; // 38 mm de ala del perfil
    const studHeight = alto_m - trackHeight * 2;

    let currentX = 0;
    while (currentX <= largo_m) {
      // Verificar si la posición del parante cae dentro de una abertura
      const insideOpening = aberturas.some(ab => 
        currentX >= ab.x && currentX <= (ab.x + ab.w)
      );

      // Si no cae en una abertura, o si es el primer/último parante (cierre), lo creamos
      if (!insideOpening || currentX === 0 || currentX >= (largo_m - 0.05)) {
        const studGeo = crearGeometriaMontante(studWidth, studHeight, trackDepth);
        addMetalMember(studGeo, metalMaterial, currentX + studWidth / 2, trackHeight, 0, "Parante Vertical (M)", studHeight, trackDepth, studWidth);
      }
      currentX += step;
    }

    // Parante de cierre al extremo derecho si la modulación no terminó exactamente ahí
    const finalPosX = largo_m - (studWidth / 2);
    const finalStudGeo = crearGeometriaMontante(studWidth, studHeight, trackDepth);
    addMetalMember(finalStudGeo, metalMaterial, finalPosX, trackHeight, 0, "Parante de Cierre (M)", studHeight, trackDepth, studWidth);

    // 3. Refuerzo Horizontal a Media Altura (Nogging/Traba estructural para muros altos en Y)
    if (alto_m >= 2.40) {
      const noggingY = alto_m / 2;
      const noggingGeo = crearGeometriaRiel(largo_m, 0.04, trackDepth);
      addMetalMember(noggingGeo, metalMaterial, 0, noggingY, 0, "Refuerzo Horizontal (R)", largo_m, trackDepth, 0.04);
    }

    // 4. Estructurar Refuerzos de Aberturas (Vanos) con perfiles reales en Y-up
    aberturas.forEach((ab) => {
      // Dintel superior del vano (Riel canal U horizontal en X a altura Y)
      const headerY = ab.y + ab.h;
      const headerHeight = 0.04;
      const headerGeo = crearGeometriaRiel(ab.w, headerHeight, trackDepth);
      addMetalMember(headerGeo, openingBorderMaterial, ab.x, headerY, 0, "Refuerzo Dintel (Riel)", ab.w, trackDepth, headerHeight);

      // Jambas (Refuerzos laterales, perfiles montantes C reales verticales en Y)
      const jambaHeight = ab.h;
      const leftJambaGeo = crearGeometriaMontante(studWidth, jambaHeight, trackDepth);
      addMetalMember(leftJambaGeo, openingBorderMaterial, ab.x - studWidth / 2, ab.y, 0, "Jamba Izquierda (Parante)", jambaHeight, trackDepth, studWidth);

      const rightJambaGeo = crearGeometriaMontante(studWidth, jambaHeight, trackDepth);
      addMetalMember(rightJambaGeo, openingBorderMaterial, ab.x + ab.w + studWidth / 2, ab.y, 0, "Jamba Derecha (Parante)", jambaHeight, trackDepth, studWidth);

      // Si es una ventana, también lleva un antepecho (refuerzo inferior, Riel canal U)
      if (ab.tipo === 'ventana') {
        const sillGeo = crearGeometriaRiel(ab.w, headerHeight, trackDepth);
        addMetalMember(sillGeo, openingBorderMaterial, ab.x, ab.y - headerHeight, 0, "Refuerzo Antepecho (Riel)", ab.w, trackDepth, headerHeight);
      }
    });

    // 5. Placas de Yeso (Caras Traslúcidas Moduladas Reales en plano X-Y)
    const plateThickness = 0.0125; // 12.5 mm de placa estándar

    if (placas && placas.length > 0) {
      placas.forEach((placa: any) => {
        // Reducimos 2mm en el ancho y el alto para generar una junta/canal visible tridimensional sumamente premium
        const pW = Math.max(0.01, placa.ancho - 0.002);
        const pH = Math.max(0.01, placa.alto - 0.002);
        // Ancho en X, alto en Y, espesor en Z
        const pGeo = new THREE.BoxGeometry(pW, pH, plateThickness);

        let pMat = plateMaterial;
        let placaTipoStr = "Placa Yeso Estándar";
        if (placa.esRetazoReutilizado) {
          placaTipoStr = "Placa Yeso (Retazo)";
          // Color verde azulado neón traslúcido para retazos reutilizados
          pMat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.35,
            roughness: 0.8,
            side: THREE.DoubleSide
          });
        } else if (placa.corteL) {
          placaTipoStr = "Placa Yeso (Corte L)";
          // Color rosa/magenta traslúcido para placas con corte en L
          pMat = new THREE.MeshStandardMaterial({
            color: 0xec4899,
            transparent: true,
            opacity: 0.35,
            roughness: 0.8,
            side: THREE.DoubleSide
          });
        }

        const matrix = new THREE.Matrix4();
        const pX = placa.x + placa.ancho / 2;
        const pY = placa.y + placa.alto / 2;
        const pZ = placa.cara === 'A' ? (trackDepth / 2 + plateThickness / 2) : -(trackDepth / 2 + plateThickness / 2);
        matrix.makeTranslation(pX, pY, pZ);

        const id = nextExpressID++;
        elements.push({
          expressID: id,
          name: `${placaTipoStr} Cara ${placa.cara}`,
          type: 'IfcPlate',
          geometry: pGeo,
          material: pMat,
          matrix,
          properties: {
            largo_m: placa.ancho,
            alto_m: placa.alto,
            espesor_m: plateThickness
          },
          category: 'placa'
        });
      });
    } else {
      // Fallback monolítico horizontal en X, vertical en Y
      const plateGeo = new THREE.BoxGeometry(largo_m, alto_m, plateThickness);
      
      const matrixA = new THREE.Matrix4();
      matrixA.makeTranslation(largo_m / 2, alto_m / 2, (trackDepth / 2) + (plateThickness / 2));
      elements.push({
        expressID: nextExpressID++,
        name: "Placa de Yeso Cara A (Monolítica)",
        type: 'IfcPlate',
        geometry: plateGeo,
        material: plateMaterial,
        matrix: matrixA,
        properties: {
          largo_m: largo_m,
          alto_m: alto_m,
          espesor_m: plateThickness
        },
        category: 'placa'
      });

      const matrixB = new THREE.Matrix4();
      matrixB.makeTranslation(largo_m / 2, alto_m / 2, -(trackDepth / 2) - (plateThickness / 2));
      elements.push({
        expressID: nextExpressID++,
        name: "Placa de Yeso Cara B (Monolítica)",
        type: 'IfcPlate',
        geometry: plateGeo,
        material: plateMaterial,
        matrix: matrixB,
        properties: {
          largo_m: largo_m,
          alto_m: alto_m,
          espesor_m: plateThickness
        },
        category: 'placa'
      });
    }

    // Compilamos en fragmentos instanciados de ThatOpen
    this.buildFragments(elements, edgesToDraw);
  }

  /**
   * Genera y renderiza en 3D la maqueta detallada de la estructura de un cielorraso
   * con perfiles primarios, secundarios, colgadores y placa horizontal.
   */
  generateCielorraso(params: CielorrasoStructureParams) {
    this.clear();

    const { largo_m, ancho_m, tipo_estructura, separacion_secundario_m, separacion_principal_m, distancia_cuelgue_m, altura_suspension_m, espesorPerfil_m } = params;

    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Slate-400
      metalness: 0.9,
      roughness: 0.15,
      side: THREE.DoubleSide
    });

    const hangerMaterial = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Amber para varillas de cuelgue
      metalness: 0.8,
      roughness: 0.2
    });

    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    let nextExpressID = 15000;
    const elements: GeneratedElement[] = [];
    const edgesToDraw: THREE.LineSegments[] = [];

    const addMetalMember = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      name = "Perfil Cielorraso",
      length = 3.0,
      depth = espesorPerfil_m,
      thickness = 0.038
    ) => {
      const matrix = new THREE.Matrix4().makeTranslation(x, y, z);
      const id = nextExpressID++;

      elements.push({
        expressID: id,
        name,
        type: 'IfcMember',
        geometry: geo,
        material: mat,
        matrix,
        properties: {
          largo_m: length,
          alto_m: thickness,
          espesor_m: depth
        },
        category: 'estructura'
      });
    };

    // 1. Placa de terminación horizontal por debajo (plano X-Z en Y = 0)
    const plateThickness = 0.0125;
    const plateGeo = new THREE.BoxGeometry(largo_m, plateThickness, ancho_m);
    const matrixPlate = new THREE.Matrix4().makeTranslation(largo_m / 2, -plateThickness / 2, ancho_m / 2);
    elements.push({
      expressID: nextExpressID++,
      name: "Placa Drywall Cielorraso",
      type: 'IfcPlate',
      geometry: plateGeo,
      material: plateMaterial,
      matrix: matrixPlate,
      properties: {
        largo_m: largo_m,
        alto_m: ancho_m,
        espesor_m: plateThickness
      },
      category: 'placa'
    });

    // 2. Perimetrales Angulares (plano X-Z)
    const angSize = 0.025; // 25mm
    // Angulares a lo largo de largo_m (eje X)
    const angLongGeo = new THREE.BoxGeometry(largo_m, angSize, angSize);
    addMetalMember(angLongGeo, metalMaterial, largo_m / 2, angSize / 2, angSize / 2, "Angular Perimetral (X)", largo_m, angSize, angSize);
    addMetalMember(angLongGeo, metalMaterial, largo_m / 2, angSize / 2, ancho_m - angSize / 2, "Angular Perimetral (X)", largo_m, angSize, angSize);

    // Angulares a lo largo de ancho_m (eje Z)
    const angTransGeo = new THREE.BoxGeometry(angSize, angSize, ancho_m - angSize * 2);
    addMetalMember(angTransGeo, metalMaterial, angSize / 2, angSize / 2, ancho_m / 2, "Angular Perimetral (Y)", ancho_m, angSize, angSize);
    addMetalMember(angTransGeo, metalMaterial, largo_m - angSize / 2, angSize / 2, ancho_m / 2, "Angular Perimetral (Y)", ancho_m, angSize, angSize);

    // 3. Perfiles Secundarios (Omegas o Parantes inferiores)
    const secWidth = 0.038;
    const secHeight = 0.038;
    const secGeo = new THREE.BoxGeometry(secWidth, secHeight, ancho_m - angSize * 2);

    let currentX = 0;
    const lineasSecundarias: number[] = [];
    while (currentX <= largo_m) {
      addMetalMember(secGeo, metalMaterial, currentX + secWidth / 2, secHeight / 2, ancho_m / 2, "Perfil Secundario (Omega/M)", ancho_m, secWidth, secHeight);
      lineasSecundarias.push(currentX);
      currentX += separacion_secundario_m;
    }
    // Cierre final secundario
    if (largo_m - lineasSecundarias[lineasSecundarias.length - 1] > 0.05) {
      addMetalMember(secGeo, metalMaterial, largo_m - secWidth / 2, secHeight / 2, ancho_m / 2, "Perfil Secundario Final (Omega/M)", ancho_m, secWidth, secHeight);
    }

    // 4. Perfiles Principales y Colgadores (solo si es suspendido)
    if (tipo_estructura === "suspendido") {
      const priWidth = 0.038;
      const priHeight = 0.038;
      const priGeo = new THREE.BoxGeometry(largo_m - angSize * 2, priHeight, priWidth);

      const sepPri = separacion_principal_m || 1.00;
      const distCuelgue = distancia_cuelgue_m || 1.20;

      let currentY = sepPri;
      const lineasPrincipalesY: number[] = [];
      
      while (currentY < ancho_m) {
        addMetalMember(priGeo, metalMaterial, largo_m / 2, secHeight + priHeight / 2, currentY, "Perfil Principal (Portante/M)", largo_m, priWidth, priHeight);
        lineasPrincipalesY.push(currentY);
        currentY += sepPri;
      }

      if (lineasPrincipalesY.length === 0) {
        addMetalMember(priGeo, metalMaterial, largo_m / 2, secHeight + priHeight / 2, ancho_m / 2, "Perfil Principal Central (Portante/M)", largo_m, priWidth, priHeight);
        lineasPrincipalesY.push(ancho_m / 2);
      }

      // 5. Colgadores de Suspensión
      const hangerRadius = 0.003; // varilla fina
      const hangerHeight = altura_suspension_m > 0 ? altura_suspension_m : 0.50;
      const hangerGeo = new THREE.CylinderGeometry(hangerRadius, hangerRadius, hangerHeight);

      lineasPrincipalesY.forEach((yVal) => {
        let hX = 0.10; // primer colgador desfasado del borde
        while (hX < largo_m) {
          const matrixHanger = new THREE.Matrix4();
          const posY = secHeight + priHeight + hangerHeight / 2;
          matrixHanger.makeTranslation(hX, posY, yVal);
          
          elements.push({
            expressID: nextExpressID++,
            name: "Varilla de Cuelgue",
            type: 'IfcMember',
            geometry: hangerGeo,
            material: hangerMaterial,
            matrix: matrixHanger,
            properties: {
              largo_m: hangerHeight,
              alto_m: hangerRadius * 2,
              espesor_m: hangerRadius * 2
            },
            category: 'estructura'
          });

          hX += distCuelgue;
        }
      });
    }

    // Compilamos en fragmentos de ThatOpen
    this.buildFragments(elements, edgesToDraw);
  }

  /**
   * Compila los elementos acumulados en fragmentos instanciados de ThatOpen e indexa sus propiedades locales.
   */
  private buildFragments(elements: GeneratedElement[], edgesToDraw: THREE.LineSegments[]) {
    const comps = this.bimWorld.components;
    const fragments = comps.get(OBC.FragmentsManager);
    const scene = this.bimWorld.world.scene.three;

    // 1. Instanciamos el FragmentsGroup
    this.fragmentsGroup = new FRAGS.FragmentsGroup();
    this.fragmentsGroup.name = "MaquetaDrywallBIM";
    this.fragmentsGroup.ifcMetadata = {
      name: "Maqueta Drywall",
      description: "Estructura y placas de drywall generadas por la calculadora",
      schema: "IFC4",
      maxExpressID: 30000
    };

    // 2. Agrupamos los elementos por combinación única de geometría y material
    const geomMatMap = new Map<THREE.BufferGeometry, Map<THREE.Material, GeneratedElement[]>>();

    for (const el of elements) {
      if (!geomMatMap.has(el.geometry)) {
        geomMatMap.set(el.geometry, new Map());
      }
      const matMap = geomMatMap.get(el.geometry)!;
      if (!matMap.has(el.material)) {
        matMap.set(el.material, []);
      }
      matMap.get(el.material)!.push(el);
    }

    // 3. Creamos un Fragment para cada combinación y añadimos sus instancias
    for (const [geometry, matMap] of geomMatMap) {
      if (!geometry.index) {
        const positionAttr = geometry.getAttribute('position');
        if (positionAttr) {
          const tempIndices: number[] = [];
          for (let i = 0; i < positionAttr.count; i++) {
            tempIndices.push(i);
          }
          geometry.setIndex(tempIndices);
        }
      }
      geometry.clearGroups(); // Evitar errores de raycast por grupos multi-material (como en ExtrudeGeometry o BoxGeometry)
      for (const [material, groupElements] of matMap) {
        const count = groupElements.length;
        const fragment = new FRAGS.Fragment(geometry, material, count);
        
        // Asignamos la categoría para control de visibilidad interactiva
        fragment.mesh.userData = { type: groupElements[0].category };
        
        // Formateamos las instancias para el fragmento
        const items: FRAGS.Item[] = groupElements.map(el => ({
          id: el.expressID,
          transforms: [el.matrix],
          colors: el.color ? [el.color] : undefined
        }));
        
        fragment.add(items);
        fragment.group = this.fragmentsGroup;
        
        // Añadimos el mesh al grupo de fragmentos
        this.fragmentsGroup.add(fragment.mesh);
        this.fragmentsGroup.items.push(fragment);
        
        // Registramos en el listado del FragmentsManager
        fragments.list.set(fragment.id, fragment);

        // Añadimos la malla del fragmento al culler para oclusión
        this.bimWorld.culler.add(fragment.mesh);
      }
      this.bimWorld.culler.needsUpdate = true;
    }

    // 4. Agregamos las aristas vectoriales
    for (const lineSegments of edgesToDraw) {
      this.fragmentsGroup.add(lineSegments);
    }

    // 5. Estructuramos y registramos las propiedades locales
    const localProperties: FRAGS.IfcProperties = {};
    for (const el of elements) {
      localProperties[el.expressID] = {
        expressID: el.expressID,
        type: el.type,
        Name: { value: el.name },
        NominalValue: { value: el.name },
        largo_m: el.properties.largo_m,
        alto_m: el.properties.alto_m,
        espesor_m: el.properties.espesor_m
      };
    }
    this.fragmentsGroup.setLocalProperties(localProperties);

    // 6. Registramos el grupo en el FragmentsManager
    fragments.groups.set(this.fragmentsGroup.uuid, this.fragmentsGroup);

    // 7. Agregamos el grupo a la escena 3D
    scene.add(this.fragmentsGroup);

    // 8. Ajustamos enfoque de cámara
    const meshes = this.fragmentsGroup.items.map(f => f.mesh);
    if (meshes.length > 0) {
      this.bimWorld.world.camera.fit(meshes, 1.3);
    }
  }

  /**
   * Cambia la visibilidad interactiva de placas o perfiles/estructura metálica en la maqueta 3D.
   */
  setVisibility(showPlacas: boolean, showEstructura: boolean) {
    if (!this.fragmentsGroup) return;
    for (const fragment of this.fragmentsGroup.items) {
      const type = fragment.mesh.userData?.type;
      if (type === 'placa') {
        fragment.mesh.visible = showPlacas;
      } else if (type === 'estructura') {
        fragment.mesh.visible = showEstructura;
      }
    }
  }

  /**
   * Limpia la maqueta tridimensional del visor y libera recursos.
   */
  clear() {
    if (this.fragmentsGroup) {
      const comps = this.bimWorld.components;
      const fragments = comps.get(OBC.FragmentsManager);
      
      // Remover del manager
      fragments.disposeGroup(this.fragmentsGroup);
      
      // Remover de la escena
      const scene = this.bimWorld.world.scene.three;
      scene.remove(this.fragmentsGroup);
      this.fragmentsGroup = null;
    }
  }
}
