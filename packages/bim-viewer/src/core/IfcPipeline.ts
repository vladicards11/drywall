import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import { BimWorld } from './BimWorld.js';

export class IfcPipeline {
  private bimWorld: BimWorld;
  private fragments: OBC.FragmentsManager;
  private loader: OBC.IfcLoader;

  constructor(bimWorld: BimWorld) {
    this.bimWorld = bimWorld;
    
    const comps = this.bimWorld.components;
    this.fragments = comps.get(OBC.FragmentsManager);
    this.loader = comps.get(OBC.IfcLoader);
  }

  /**
   * Inicializa los cargadores y configura la ruta de web-ifc WASM.
   */
  async init(wasmPath = '/web-ifc/') {
    // Configurar el IfcLoader
    await this.loader.setup();
    
    this.loader.settings.wasm = {
      path: wasmPath,
      absolute: wasmPath.startsWith('http') || wasmPath.startsWith('/')
    };

    // Al cargar un grupo de fragmentos (IFC completo), agregarlo a la escena
    this.fragments.onFragmentsLoaded.add((model) => {
      this.bimWorld.world.scene.three.add(model);

      // Z-Fighting prevention y Culling
      for (const fragment of model.items) {
        // Culling
        this.bimWorld.culler.add(fragment.mesh);

        const material = fragment.mesh.material;
        const materials = Array.isArray(material) ? material : [material];
        for (const mat of materials) {
          mat.polygonOffset = true;
          mat.polygonOffsetUnits = 1;
          mat.polygonOffsetFactor = Math.random();
        }
      }
      this.bimWorld.culler.needsUpdate = true;
    });
  }

  /**
   * Carga un archivo IFC desde un Buffer de memoria.
   * @param buffer ArrayBuffer que representa el archivo .ifc
   * @param modelName Nombre opcional del modelo
   */
  async loadIfc(buffer: Uint8Array, modelName?: string) {
    const model = await this.loader.load(buffer, true, modelName);
    
    // Ajustamos la cámara para enfocar el modelo recién cargado
    if (model && this.fragments.meshes.length > 0) {
      await this.bimWorld.world.camera.fit(this.fragments.meshes, 1.2);
    }
    
    return model;
  }

  /**
   * Limpia todos los modelos cargados en el visualizador.
   */
  clear() {
    for (const [, group] of this.fragments.groups) {
      this.fragments.disposeGroup(group);
      this.bimWorld.world.scene.three.remove(group);
    }
  }
}
