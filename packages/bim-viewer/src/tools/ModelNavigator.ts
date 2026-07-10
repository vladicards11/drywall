import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import * as FRAGS from '@thatopen/fragments';
import { BimWorld } from '../core/BimWorld.js';

export interface ElementProperties {
  expressID: number;
  name: string;
  type: string;
  nominalValue?: string;
  [key: string]: any;
}

export class ModelNavigator {
  private bimWorld: BimWorld;
  private highlighter: OBF.Highlighter;
  private hider: OBC.Hider;
  private fragmentsManager: OBC.FragmentsManager;

  // Callback cuando el usuario selecciona un elemento
  private onElementSelectedCallback?: (props: ElementProperties | null) => void;

  // Mapas para almacenar la agrupación de elementos por categoría IFC
  // Estructura: { [categoriaIFC]: { [fragmentID]: Set<number> } }
  private categoryElementMaps = new Map<string, FRAGS.FragmentIdMap>();

  constructor(bimWorld: BimWorld) {
    this.bimWorld = bimWorld;
    const comps = this.bimWorld.components;

    this.fragmentsManager = comps.get(OBC.FragmentsManager);
    this.hider = comps.get(OBC.Hider);
    this.highlighter = comps.get(OBF.Highlighter);

    // Inicializamos el Highlighter interactivo
    this.highlighter.setup({
      world: this.bimWorld.world,
      selectionColor: new THREE.Color(0x6366f1), // Indigo-500 premium accent color
      hoverColor: new THREE.Color(0xfacc15), // Yellow-400 premium accent color
      selectEnabled: true,
      hoverEnabled: true,
      autoHighlightOnClick: true
    });

    // Suscribir eventos de selección
    this.setupHighlightEvents();
  }

  /**
   * Registra un callback para notificar al componente de React cuando cambie la selección.
   */
  onElementSelected(callback: (props: ElementProperties | null) => void) {
    this.onElementSelectedCallback = callback;
  }

  /**
   * Procesa las propiedades del modelo IFC cargado para indexarlo por categorías de diseño.
   * Esto posibilita el filtrado inmediato en 3D.
   * @param model Grupo de fragmentos del modelo cargado (FragmentsGroup)
   */
  indexModelCategories(model: FRAGS.FragmentsGroup) {
    this.categoryElementMaps.clear();
    const properties = model.getLocalProperties();
    if (!properties) return;

    // Recorremos los fragmentos del modelo
    for (const fragment of model.items) {
      const fragmentID = fragment.id;
      
      // Recorremos los expressIDs contenidos en el fragmento
      for (const expressID of fragment.ids) {
        const itemProps = properties[expressID];
        if (itemProps) {
          // ej: "IFCWALL", "IFCSLAB", "IFCROOF", "IFCCOLUMN", "IFCDOOR", "IFCWINDOW"
          const type = (itemProps.type || 'UNKNOWN').toUpperCase();

          if (!this.categoryElementMaps.has(type)) {
            this.categoryElementMaps.set(type, {});
          }

          const idMap = this.categoryElementMaps.get(type)!;
          if (!idMap[fragmentID]) {
            idMap[fragmentID] = new Set<number>();
          }
          idMap[fragmentID].add(expressID);
        }
      }
    }
  }

  /**
   * Obtiene la lista de categorías IFC presentes en el modelo cargado.
   */
  getAvailableCategories(): string[] {
    return Array.from(this.categoryElementMaps.keys());
  }

  /**
   * Muestra u oculta los elementos tridimensionales pertenecientes a una categoría IFC.
   * @param category Categoría IFC (ej: "IFCWALLSTANDARDCASE", "IFCSLAB")
   * @param visible Estado de visibilidad deseado
   */
  setCategoryVisibility(category: string, visible: boolean) {
    const idMap = this.categoryElementMaps.get(category.toUpperCase());
    if (idMap) {
      this.hider.set(visible, idMap);
    }
  }

  /**
   * Configura las suscripciones a eventos de resalte de selección de ThatOpen.
   */
  private setupHighlightEvents() {
    const selectEvents = this.highlighter.events.select;
    if (!selectEvents) return;

    // Evento de Selección (Click)
    selectEvents.onHighlight.add((fragmentIdMap) => {
      // Tomamos el primer elemento seleccionado para mostrar sus propiedades en el panel lateral
      let selectedProps: ElementProperties | null = null;

      for (const fragmentID in fragmentIdMap) {
        const expressIDs = fragmentIdMap[fragmentID];
        const fragment = this.fragmentsManager.list.get(fragmentID);
        
        if (fragment && fragment.group) {
          const props = fragment.group.getLocalProperties();
          if (props) {
            for (const expressID of expressIDs) {
              const itemProps = props[expressID];
              if (itemProps) {
                // Cálculo matemático del Bounding Box de la instancia seleccionada
                let largo_m = 0;
                let alto_m = 0;
                let espesor_m = 0;

                try {
                  const keys = fragment.itemToInstances.get(expressID);
                  if (keys && keys.size > 0) {
                    const totalBox = new THREE.Box3();
                    const matrix = new THREE.Matrix4();
                    
                    for (const key of keys) {
                      fragment.mesh.getMatrixAt(key, matrix);
                      matrix.premultiply(fragment.mesh.matrixWorld);
                      
                      const tempBox = new THREE.Box3();
                      fragment.mesh.geometry.computeBoundingBox();
                      if (fragment.mesh.geometry.boundingBox) {
                        tempBox.copy(fragment.mesh.geometry.boundingBox).applyMatrix4(matrix);
                        totalBox.union(tempBox);
                      }
                    }

                    // Deducir dimensiones físicas del muro
                    const size = new THREE.Vector3();
                    totalBox.getSize(size);
                    alto_m = size.y;
                    largo_m = Math.max(size.x, size.z);
                    espesor_m = Math.min(size.x, size.z);
                  }
                } catch (geomErr) {
                  console.warn("No se pudo calcular la geometría exacta:", geomErr);
                }

                selectedProps = {
                  expressID,
                  name: itemProps.Name?.value || `Elemento #${expressID}`,
                  type: itemProps.type || 'Desconocido',
                  largo_m: Number(largo_m.toFixed(2)),
                  alto_m: Number(alto_m.toFixed(2)),
                  espesor_m: Number(espesor_m.toFixed(3)),
                  ...itemProps
                };
                break; // Tomar el primer elemento representativo
              }
            }
          }
        }
        if (selectedProps) break;
      }

      if (this.onElementSelectedCallback) {
        this.onElementSelectedCallback(selectedProps);
      }
    });

    // Evento de Limpieza de Selección
    selectEvents.onClear.add(() => {
      if (this.onElementSelectedCallback) {
        this.onElementSelectedCallback(null);
      }
    });
  }

  /**
   * Limpia el resaltador.
   */
  clear() {
    this.highlighter.clear();
    if (this.onElementSelectedCallback) {
      this.onElementSelectedCallback(null);
    }
  }
}
