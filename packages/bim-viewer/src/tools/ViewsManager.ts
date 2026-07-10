import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { BimWorld } from '../core/BimWorld.js';

export type View2DType = 'top' | 'front' | 'side' | 'perspective';

export class ViewsManager {
  private bimWorld: BimWorld;
  private clipper: OBC.Clipper;

  constructor(bimWorld: BimWorld) {
    this.bimWorld = bimWorld;
    const comps = this.bimWorld.components;

    // Obtenemos el Clipper de OBC
    this.clipper = comps.get(OBC.Clipper);
    this.clipper.enabled = false; // Desactivado por defecto
  }

  /**
   * Cambia la orientación y tipo de proyección de la cámara del visor.
   * @param type Tipo de vista ('top' | 'front' | 'side' | 'perspective')
   */
  async setView(type: View2DType) {
    const camera = this.bimWorld.world.camera;
    const scene = this.bimWorld.world.scene.three;

    // Calcular el bounding box del modelo para encuadrar correctamente
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Distancia prudente para colocar la cámara basada en el tamaño del modelo
    const distance = Math.max(size.x, size.y, size.z) * 1.5 || 50;

    if (type === 'perspective') {
      // Regresar a visualización perspectiva orbital libre
      await camera.projection.set('Perspective');
      camera.set('Orbit');
      
      // Enfocar escena
      const meshes: THREE.Mesh[] = [];
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) meshes.push(obj);
      });
      if (meshes.length > 0) {
        await camera.fit(meshes, 1.2);
      }
    } else {
      // Activar proyección ortográfica y navegación plana 2D (bloquea rotación)
      await camera.projection.set('Orthographic');
      camera.set('Plan');

      if (type === 'top') {
        // Vista de planta superior (mirando en Y hacia abajo)
        await camera.controls.setLookAt(
          center.x,
          center.y + distance,
          center.z,
          center.x,
          center.y,
          center.z,
          true
        );
      } else if (type === 'front') {
        // Vista frontal (mirando en Z hacia adentro)
        await camera.controls.setLookAt(
          center.x,
          center.y,
          center.z + distance,
          center.x,
          center.y,
          center.z,
          true
        );
      } else if (type === 'side') {
        // Vista lateral (mirando en X hacia adentro)
        await camera.controls.setLookAt(
          center.x + distance,
          center.y,
          center.z,
          center.x,
          center.y,
          center.z,
          true
        );
      }
    }
  }

  /**
   * Habilita/deshabilita el Clipper interactivo de secciones.
   */
  setClippingEnabled(enabled: boolean) {
    this.clipper.enabled = enabled;
  }

  /**
   * Devuelve si el clipper interactivo está activo.
   */
  isClippingEnabled(): boolean {
    return this.clipper.enabled;
  }

  /**
   * Limpia todos los planos de sección activos.
   */
  clearClippingPlanes() {
    this.clipper.deleteAll();
  }
}
