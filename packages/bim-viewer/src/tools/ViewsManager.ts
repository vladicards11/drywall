import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import { BimWorld } from '../core/BimWorld.js';

export type View2DType = 'top' | 'front' | 'side' | 'perspective';

export class ViewsManager {
  private bimWorld: BimWorld;
  private clipper: OBC.Clipper;
  private plans: OBF.Plans;

  constructor(bimWorld: BimWorld) {
    this.bimWorld = bimWorld;
    const comps = this.bimWorld.components;

    // Obtenemos el Clipper de OBC
    this.clipper = comps.get(OBC.Clipper);
    this.clipper.enabled = false; // Desactivado por defecto

    // Inicializamos Plans de OBF
    this.plans = comps.get(OBF.Plans);
    this.plans.world = this.bimWorld.world;
  }

  /**
   * Genera los planos de planta para un modelo IFC cargado.
   */
  async generatePlans(model: any) {
    await this.plans.generate(model);
  }

  /**
   * Obtiene la lista de planos de planta generados.
   */
  getPlans() {
    return this.plans.list;
  }

  /**
   * Navega a un plano de planta específico por su ID.
   */
  async goToPlan(id: string) {
    this.bimWorld.setCullerEnabled(false);
    this.plans.enabled = true;
    await this.plans.goTo(id, true);
  }

  /**
   * Sale de la vista de plano de planta y regresa a la vista 3D.
   */
  async exitPlan() {
    await this.plans.exitPlanView(true);
    this.plans.enabled = false;
    this.bimWorld.setCullerEnabled(true);
  }

  /**
   * Cambia la orientación y tipo de proyección de la cámara del visor.
   * @param type Tipo de vista ('top' | 'front' | 'side' | 'perspective')
   */
  async setView(type: View2DType) {
    const camera = this.bimWorld.world.camera;
    const scene = this.bimWorld.world.scene.three;

    // Salir de la vista de planos de planta si estaba activa
    if (this.plans.enabled) {
      await this.exitPlan();
    }

    // Calcular el bounding box del modelo para encuadrar correctamente
    const box = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Distancia prudente para colocar la cámara basada en el tamaño del modelo
    const distance = Math.max(size.x, size.y, size.z) * 1.5 || 50;

    if (type === 'perspective') {
      this.bimWorld.setCullerEnabled(true);
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
      this.bimWorld.setCullerEnabled(false);
      // Activar proyección ortográfica y navegación plana 2D (bloquea rotación)
      await camera.projection.set('Orthographic');
      camera.set('Plan');

      if (type === 'top') {
        // Vista de planta superior (mirando en Y hacia abajo en sistema Y-up estándar)
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
        // Vista frontal / Alzada (mirando en Z hacia adentro en sistema Y-up estándar)
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
    this.plans.exitPlanView(false);
    this.plans.enabled = false;
    this.bimWorld.setCullerEnabled(true);
  }
}
