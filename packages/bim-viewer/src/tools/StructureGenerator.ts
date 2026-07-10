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

    const { largo_m, alto_m, separacionParantes_m, espesorPerfil_m, aberturas } = params;

    // Materiales premium con estética tipo CAD metalizada / traslúcida
    const metalMaterial = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Slate-400
      metalness: 0.9,
      roughness: 0.15,
      side: THREE.DoubleSide
    });

    const plateMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.8,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const openingBorderMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e, // Rosado/rojo para marcar refuerzos de aberturas
      metalness: 0.5,
      roughness: 0.3
    });

    // 1. Riel Inferior y Riel Superior
    const trackHeight = 0.04; // 4 cm de alto
    const trackDepth = espesorPerfil_m;

    const group = this.group;

    const bottomTrackGeo = new THREE.BoxGeometry(largo_m, trackHeight, trackDepth);
    const bottomTrack = new THREE.Mesh(bottomTrackGeo, metalMaterial);
    bottomTrack.position.set(largo_m / 2, trackHeight / 2, 0);
    group.add(bottomTrack);

    const topTrackGeo = new THREE.BoxGeometry(largo_m, trackHeight, trackDepth);
    const topTrack = new THREE.Mesh(topTrackGeo, metalMaterial);
    topTrack.position.set(largo_m / 2, alto_m - trackHeight / 2, 0);
    group.add(topTrack);

    // 2. Parantes Verticales (Modulación)
    const studWidth = 0.038; // 38 mm de ancho (parante estándar)
    const studHeight = alto_m - trackHeight * 2;
    const studGeo = new THREE.BoxGeometry(studWidth, studHeight, trackDepth - 0.002);

    let currentX = 0;
    while (currentX <= largo_m) {
      // Verificar si la posición del parante cae dentro de una abertura
      const insideOpening = aberturas.some(ab => 
        currentX >= ab.x && currentX <= (ab.x + ab.w)
      );

      // Si no cae en una abertura, o si es el primer/último parante (cierre), lo creamos
      if (!insideOpening || currentX === 0 || currentX >= (largo_m - 0.05)) {
        const stud = new THREE.Mesh(studGeo, metalMaterial);
        stud.position.set(currentX + studWidth / 2, alto_m / 2, 0);
        group.add(stud);
      }
      currentX += separacionParantes_m;
    }

    // Parante de cierre al extremo derecho si la modulación no terminó exactamente ahí
    const finalPosX = largo_m - studWidth;
    const finalStud = new THREE.Mesh(studGeo, metalMaterial);
    finalStud.position.set(finalPosX + studWidth / 2, alto_m / 2, 0);
    group.add(finalStud);

    // 3. Estructurar Refuerzos de Aberturas (Vanos)
    aberturas.forEach((ab) => {
      // Dintel superior del vano
      const headerY = ab.y + ab.h;
      const headerHeight = 0.04;
      const headerGeo = new THREE.BoxGeometry(ab.w, headerHeight, trackDepth);
      const header = new THREE.Mesh(headerGeo, openingBorderMaterial);
      header.position.set(ab.x + ab.w / 2, headerY + headerHeight / 2, 0);
      group.add(header);

      // Jambas (parantes de refuerzo laterales del vano)
      const jambaHeight = ab.h;
      const jambaGeo = new THREE.BoxGeometry(studWidth, jambaHeight, trackDepth - 0.002);

      const leftJamba = new THREE.Mesh(jambaGeo, openingBorderMaterial);
      leftJamba.position.set(ab.x - studWidth / 2, ab.y + ab.h / 2, 0);
      group.add(leftJamba);

      const rightJamba = new THREE.Mesh(jambaGeo, openingBorderMaterial);
      rightJamba.position.set(ab.x + ab.w + studWidth / 2, ab.y + ab.h / 2, 0);
      group.add(rightJamba);

      // Si es una ventana, también lleva un antepecho (refuerzo inferior)
      if (ab.tipo === 'ventana') {
        const sillGeo = new THREE.BoxGeometry(ab.w, headerHeight, trackDepth);
        const sill = new THREE.Mesh(sillGeo, openingBorderMaterial);
        sill.position.set(ab.x + ab.w / 2, ab.y - headerHeight / 2, 0);
        group.add(sill);
      }
    });

    // 4. Placas de Yeso (Caras Traslúcidas)
    const plateThickness = 0.0125; // 12.5 mm de placa estándar
    const plateGeo = new THREE.BoxGeometry(largo_m, alto_m, plateThickness);

    // Placa Cara A (Frontal)
    const plateA = new THREE.Mesh(plateGeo, plateMaterial);
    plateA.position.set(largo_m / 2, alto_m / 2, (trackDepth / 2) + (plateThickness / 2));
    group.add(plateA);

    // Placa Cara B (Posterior)
    const plateB = new THREE.Mesh(plateGeo, plateMaterial);
    plateB.position.set(largo_m / 2, alto_m / 2, -(trackDepth / 2) - (plateThickness / 2));
    group.add(plateB);

    // Agregar el grupo completo a la escena 3D
    scene.add(group);

    // Autofit de cámara en la maqueta
    const meshes: THREE.Mesh[] = [];
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    if (meshes.length > 0) {
      this.bimWorld.world.camera.fit(meshes, 1.3);
    }
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
