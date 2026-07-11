import * as THREE from 'three';
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

// Generadores de geometría 3D de perfilería metálica extruida a escala real
function crearGeometriaMontante(studWidth: number, studHeight: number, trackDepth: number): THREE.BufferGeometry {
  const t = 0.0025; // Espesor de chapa optimizado para visualización 3D nítida (2.5 mm) para evitar Z-Fighting
  const w = trackDepth - 0.002;
  const f = studWidth;
  const lip = 0.008; // Labio/pestaña interna de rigidización estándar

  const shape = new THREE.Shape();
  // Se dibuja el contorno cerrado de la sección en "C" hueca real en el plano X-Y local
  shape.moveTo(-w/2, 0);
  shape.lineTo(w/2, 0);
  shape.lineTo(w/2, f);
  shape.lineTo(w/2 - lip, f);
  shape.lineTo(w/2 - lip, f - t);
  shape.lineTo(w/2 - t, f - t);
  shape.lineTo(w/2 - t, t);
  shape.lineTo(-w/2 + t, t);
  shape.lineTo(-w/2 + t, f - t);
  shape.lineTo(-w/2 + t + lip, f - t);
  shape.lineTo(-w/2 + t + lip, f);
  shape.lineTo(-w/2, f);
  shape.lineTo(-w/2, 0);

  const extrudeSettings = {
    depth: studHeight,
    bevelEnabled: false
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Rota Z para alinear el alma en Y y las alas en X (Z-up nativo)
  geo.rotateZ(Math.PI / 2);
  return geo;
}

function crearGeometriaRiel(largo: number, trackHeight: number, trackDepth: number): THREE.BufferGeometry {
  const t = 0.0025; // Espesor de chapa optimizado para visualización 3D nítida (2.5 mm) para evitar Z-Fighting
  const w = trackDepth;
  const h = trackHeight;

  const shape = new THREE.Shape();
  // Se dibuja el contorno cerrado de la sección en "U" hueca real en el plano X-Y local
  shape.moveTo(-w/2, h);
  shape.lineTo(-w/2, 0);
  shape.lineTo(w/2, 0);
  shape.lineTo(w/2, h);
  shape.lineTo(w/2 - t, h);
  shape.lineTo(w/2 - t, t);
  shape.lineTo(-w/2 + t, t);
  shape.lineTo(-w/2 + t, h);
  shape.lineTo(-w/2, h);

  const extrudeSettings = {
    depth: largo,
    bevelEnabled: false
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Alinea la extrusión con X global y apoya el alma en el suelo (X-Y)
  geo.rotateY(Math.PI / 2);
  geo.rotateX(Math.PI / 2);
  return geo;
}

export class StructureGenerator {
  private bimWorld: BimWorld;
  private group: THREE.Group | null = null;

  constructor(bimWorld: BimWorld) {
    this.bimWorld = bimWorld;
  }

  /**
   * Genera y renderiza en 3D la maqueta detallada de la estructura metálica (parantes, rieles) 
   * y las placas de yeso a partir de los datos calculados.
   */
  generate(params: WallStructureParams) {
    this.clear();

    const scene = this.bimWorld.world.scene.three;
    this.group = new THREE.Group();
    this.group.name = "MaquetaDrywallEstructural";

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

    const group = this.group;

    // Función auxiliar para dibujar un perfil de metal con sus aristas vectoriales definidas (estilo CAD premium)
    const addMetalMember = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.userData = { type: 'estructura' };
      group.add(mesh);

      // Agregar líneas de bordes
      const edges = new THREE.EdgesGeometry(geo);
      const lineSegments = new THREE.LineSegments(edges, edgeMaterial);
      lineSegments.position.set(x, y, z);
      lineSegments.userData = { type: 'estructura' };
      group.add(lineSegments);
    };

    // 1. Riel Inferior y Riel Superior (Perfiles canal U reales en plano X-Y con alas hacia +Z)
    const trackHeight = 0.04; // 4 cm de alto
    const trackDepth = espesorPerfil_m;

    const bottomTrackGeo = crearGeometriaRiel(largo_m, trackHeight, trackDepth);
    addMetalMember(bottomTrackGeo, metalMaterial, 0, 0, 0); // Suelo (Z = 0)

    const topTrackGeo = crearGeometriaRiel(largo_m, trackHeight, trackDepth);
    addMetalMember(topTrackGeo, metalMaterial, 0, 0, alto_m - trackHeight); // Techo (Z = alto_m - trackHeight)

    // 2. Parantes Verticales (Perfiles montantes C reales verticales en Z, con alma en Y y alas en X)
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
        addMetalMember(studGeo, metalMaterial, currentX + studWidth / 2, 0, trackHeight);
      }
      currentX += step;
    }

    // Parante de cierre al extremo derecho si la modulación no terminó exactamente ahí
    const finalPosX = largo_m - studWidth;
    const finalStudGeo = crearGeometriaMontante(studWidth, studHeight, trackDepth);
    addMetalMember(finalStudGeo, metalMaterial, finalPosX + studWidth / 2, 0, trackHeight);

    // 3. Refuerzo Horizontal a Media Altura (Nogging/Traba estructural para muros altos en Z)
    if (alto_m >= 2.40) {
      const noggingZ = alto_m / 2;
      const noggingGeo = crearGeometriaRiel(largo_m, 0.04, trackDepth);
      addMetalMember(noggingGeo, metalMaterial, 0, 0, noggingZ);
    }

    // 4. Estructurar Refuerzos de Aberturas (Vanos) con perfiles reales en Z-up
    aberturas.forEach((ab) => {
      // Dintel superior del vano (Riel canal U horizontal en X a altura Z)
      const headerZ = ab.y + ab.h;
      const headerHeight = 0.04;
      const headerGeo = crearGeometriaRiel(ab.w, headerHeight, trackDepth);
      addMetalMember(headerGeo, openingBorderMaterial, ab.x, 0, headerZ);

      // Jambas (Refuerzos laterales, perfiles montantes C reales verticales en Z)
      const jambaHeight = ab.h;
      const leftJambaGeo = crearGeometriaMontante(studWidth, jambaHeight, trackDepth);
      addMetalMember(leftJambaGeo, openingBorderMaterial, ab.x - studWidth / 2, 0, ab.y);

      const rightJambaGeo = crearGeometriaMontante(studWidth, jambaHeight, trackDepth);
      addMetalMember(rightJambaGeo, openingBorderMaterial, ab.x + ab.w + studWidth / 2, 0, ab.y);

      // Si es una ventana, también lleva un antepecho (refuerzo inferior, Riel canal U)
      if (ab.tipo === 'ventana') {
        const sillGeo = crearGeometriaRiel(ab.w, headerHeight, trackDepth);
        addMetalMember(sillGeo, openingBorderMaterial, ab.x, 0, ab.y - headerHeight);
      }
    });

    // 5. Placas de Yeso (Caras Traslúcidas Moduladas Reales en plano X-Z)
    const plateThickness = 0.0125; // 12.5 mm de placa estándar

    if (placas && placas.length > 0) {
      placas.forEach((placa: any) => {
        // Reducimos 2mm en el ancho y el alto para generar una junta/canal visible tridimensional sumamente premium
        const pW = Math.max(0.01, placa.ancho - 0.002);
        const pH = Math.max(0.01, placa.alto - 0.002);
        // Ancho en X, espesor en Y, alto en Z
        const pGeo = new THREE.BoxGeometry(pW, plateThickness, pH);

        let pMat = plateMaterial;
        if (placa.esRetazoReutilizado) {
          // Color verde azulado neón traslúcido para retazos reutilizados
          pMat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            transparent: true,
            opacity: 0.35,
            roughness: 0.8,
            side: THREE.DoubleSide
          });
        } else if (placa.corteL) {
          // Color rosa/magenta traslúcido para placas con corte en L
          pMat = new THREE.MeshStandardMaterial({
            color: 0xec4899,
            transparent: true,
            opacity: 0.35,
            roughness: 0.8,
            side: THREE.DoubleSide
          });
        }

        const plateMesh = new THREE.Mesh(pGeo, pMat);
        plateMesh.userData = { type: 'placa' };

        // Posicionar placa (X, Y, Z) en el sistema Z-up
        const pX = placa.x + placa.ancho / 2;
        const pY = placa.cara === 'A' ? (trackDepth / 2 + plateThickness / 2) : -(trackDepth / 2 + plateThickness / 2);
        const pZ = placa.y + placa.alto / 2;

        plateMesh.position.set(pX, pY, pZ);
        group.add(plateMesh);
      });
    } else {
      // Fallback monolítico horizontal en X, vertical en Z
      const plateGeo = new THREE.BoxGeometry(largo_m, plateThickness, alto_m);
      const plateA = new THREE.Mesh(plateGeo, plateMaterial);
      plateA.userData = { type: 'placa' };
      plateA.position.set(largo_m / 2, (trackDepth / 2) + (plateThickness / 2), alto_m / 2);
      group.add(plateA);

      const plateB = new THREE.Mesh(plateGeo, plateMaterial);
      plateB.userData = { type: 'placa' };
      plateB.position.set(largo_m / 2, -(trackDepth / 2) - (plateThickness / 2), alto_m / 2);
      group.add(plateB);
    }

    // Clasificar el resto de mallas (perfilería) en el grupo
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (!child.userData.type) {
          child.userData.type = 'estructura';
        }
      }
    });

    // Agregar el grupo completo a la escena 3D
    scene.add(group);

    // Autofit de cámara en la maqueta
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.visible) {
        meshes.push(child);
      }
    });
    if (meshes.length > 0) {
      this.bimWorld.world.camera.fit(meshes, 1.3);
    }
  }

  /**
   * Genera y renderiza en 3D la maqueta detallada de la estructura de un cielorraso
   * con perfiles primarios, secundarios, colgadores y placa horizontal.
   */
  generateCielorraso(params: CielorrasoStructureParams) {
    this.clear();

    const scene = this.bimWorld.world.scene.three;
    this.group = new THREE.Group();
    this.group.name = "MaquetaDrywallCielorraso";

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

    const group = this.group;

    // 1. Placa de terminación horizontal por debajo (plano X-Y en Z = 0)
    const plateThickness = 0.0125;
    const plateGeo = new THREE.BoxGeometry(largo_m, ancho_m, plateThickness);
    const plate = new THREE.Mesh(plateGeo, plateMaterial);
    plate.position.set(largo_m / 2, ancho_m / 2, -plateThickness / 2);
    group.add(plate);

    // 2. Perimetrales Angulares (plano X-Y)
    const angSize = 0.025; // 25mm
    // Angulares a lo largo de largo_m (eje X)
    const angLongGeo = new THREE.BoxGeometry(largo_m, angSize, angSize);
    const ang1 = new THREE.Mesh(angLongGeo, metalMaterial);
    ang1.position.set(largo_m / 2, angSize / 2, angSize / 2);
    group.add(ang1);

    const ang2 = new THREE.Mesh(angLongGeo, metalMaterial);
    ang2.position.set(largo_m / 2, ancho_m - angSize / 2, angSize / 2);
    group.add(ang2);

    // Angulares a lo largo de ancho_m (eje Y)
    const angTransGeo = new THREE.BoxGeometry(angSize, ancho_m - angSize * 2, angSize);
    const ang3 = new THREE.Mesh(angTransGeo, metalMaterial);
    ang3.position.set(angSize / 2, ancho_m / 2, angSize / 2);
    group.add(ang3);

    const ang4 = new THREE.Mesh(angTransGeo, metalMaterial);
    ang4.position.set(largo_m - angSize / 2, ancho_m / 2, angSize / 2);
    group.add(ang4);

    // 3. Perfiles Secundarios (Omegas o Parantes inferiores)
    // Corren paralelos al ancho_m (eje Y), modulados cada separacion_secundario_m a lo largo del largo_m (eje X)
    const secWidth = 0.038;
    const secHeight = 0.038;
    const secGeo = new THREE.BoxGeometry(secWidth, ancho_m - angSize * 2, secHeight);

    let currentX = 0;
    const lineasSecundarias: number[] = [];
    while (currentX <= largo_m) {
      const sec = new THREE.Mesh(secGeo, metalMaterial);
      sec.position.set(currentX + secWidth / 2, ancho_m / 2, secHeight / 2);
      group.add(sec);
      lineasSecundarias.push(currentX);
      currentX += separacion_secundario_m;
    }
    // Cierre final secundario
    if (largo_m - lineasSecundarias[lineasSecundarias.length - 1] > 0.05) {
      const sec = new THREE.Mesh(secGeo, metalMaterial);
      sec.position.set(largo_m - secWidth / 2, ancho_m / 2, secHeight / 2);
      group.add(sec);
      lineasSecundarias.push(largo_m - secWidth);
    }

    // 4. Perfiles Principales y Colgadores (solo si es suspendido)
    if (tipo_estructura === "suspendido") {
      const priWidth = 0.038;
      const priHeight = 0.038;
      const priGeo = new THREE.BoxGeometry(largo_m - angSize * 2, priWidth, priHeight);

      const sepPri = separacion_principal_m || 1.00;
      const distCuelgue = distancia_cuelgue_m || 1.20;

      // Colocamos líneas principales paralelas al largo (eje X) y distribuidas en ancho (eje Y)
      let currentY = sepPri;
      const lineasPrincipalesY: number[] = [];
      
      while (currentY < ancho_m) {
        const pri = new THREE.Mesh(priGeo, metalMaterial);
        // Colocados por encima del secundario (Z = secHeight + priHeight / 2)
        pri.position.set(largo_m / 2, currentY, secHeight + priHeight / 2);
        group.add(pri);
        lineasPrincipalesY.push(currentY);
        currentY += sepPri;
      }

      // Si no se creó ninguna línea intermedia, forzar una en el centro
      if (lineasPrincipalesY.length === 0) {
        const pri = new THREE.Mesh(priGeo, metalMaterial);
        pri.position.set(largo_m / 2, ancho_m / 2, secHeight + priHeight / 2);
        group.add(pri);
        lineasPrincipalesY.push(ancho_m / 2);
      }

      // 5. Colgadores de Suspensión
      // Se colocan a lo largo de cada línea principal (eje X)
      const hangerRadius = 0.003; // varilla fina
      const hangerHeight = altura_suspension_m > 0 ? altura_suspension_m : 0.50;
      const hangerGeo = new THREE.CylinderGeometry(hangerRadius, hangerRadius, hangerHeight);
      // Rotamos la geometría del cilindro para que quede vertical en Z
      hangerGeo.rotateX(Math.PI / 2);

      lineasPrincipalesY.forEach((yVal) => {
        let hX = 0.10; // primer colgador desfasado del borde
        while (hX < largo_m) {
          const hanger = new THREE.Mesh(hangerGeo, hangerMaterial);
          const posZ = secHeight + priHeight + hangerHeight / 2;
          hanger.position.set(hX, yVal, posZ);
          group.add(hanger);
          hX += distCuelgue;
        }
      });
    }

    // Clasificar las mallas en el grupo para control de visibilidad
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.material === plateMaterial) {
          child.userData = { type: 'placa' };
        } else {
          child.userData = { type: 'estructura' };
        }
      }
    });

    // Agregar el grupo completo a la escena 3D
    scene.add(group);

    // Autofit de cámara en la maqueta
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.visible) {
        meshes.push(child);
      }
    });
    if (meshes.length > 0) {
      this.bimWorld.world.camera.fit(meshes, 1.3);
    }
  }

  /**
   * Cambia la visibilidad interactiva de placas o perfiles/estructura metálica en la maqueta 3D.
   */
  setVisibility(showPlacas: boolean, showEstructura: boolean) {
    if (!this.group) return;
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const type = child.userData?.type;
        if (type === 'placa') {
          child.visible = showPlacas;
        } else if (type === 'estructura') {
          child.visible = showEstructura;
        }
      }
    });
  }

  /**
   * Limpia la maqueta tridimensional estructurada del visor.
   */
  clear() {
    if (this.group) {
      // Liberar memoria de geometrías y materiales
      this.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });

      const scene = this.bimWorld.world.scene.three;
      scene.remove(this.group);
      this.group = null;
    }
  }
}
