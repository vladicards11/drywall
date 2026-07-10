import * as THREE from 'three';
import * as OBC from '@thatopen/components';
import * as OBF from '@thatopen/components-front';
import { BimWorld } from '../core/BimWorld.js';

export type MeasureMode = 'length' | 'angle' | 'area' | 'none';

export class MeasureTools {
  private bimWorld: BimWorld;
  private lengthMeasure: OBF.LengthMeasurement;
  private angleMeasure: OBF.AngleMeasurement;
  private areaMeasure: OBF.AreaMeasurement;
  
  private currentMode: MeasureMode = 'none';

  constructor(bimWorld: BimWorld) {
    this.bimWorld = bimWorld;
    const comps = this.bimWorld.components;

    // Instanciamos las herramientas desde el Components system
    this.lengthMeasure = comps.get(OBF.LengthMeasurement);
    this.angleMeasure = comps.get(OBF.AngleMeasurement);
    this.areaMeasure = comps.get(OBF.AreaMeasurement);

    // Asignamos el mundo a cada una de ellas
    this.lengthMeasure.world = this.bimWorld.world;
    this.angleMeasure.world = this.bimWorld.world;
    this.areaMeasure.world = this.bimWorld.world;

    // Desactivadas por defecto
    this.disableAll();
  }

  /**
   * Cambia el modo de medición activo.
   * @param mode Modo de medición ('length' | 'angle' | 'area' | 'none')
   */
  setMode(mode: MeasureMode) {
    this.disableAll();
    this.currentMode = mode;

    if (mode === 'length') {
      this.lengthMeasure.enabled = true;
    } else if (mode === 'angle') {
      this.angleMeasure.enabled = true;
    } else if (mode === 'area') {
      this.areaMeasure.enabled = true;
    }
  }

  /**
   * Devuelve el modo actual de medición.
   */
  getMode(): MeasureMode {
    return this.currentMode;
  }

  /**
   * Borra todas las mediciones realizadas en el mundo.
   */
  clearAll() {
    this.lengthMeasure.deleteAll();
    this.angleMeasure.deleteAll();
    this.areaMeasure.deleteAll();
  }

  /**
   * Cambia el color de las líneas de medición (para coincidir con el diseño estético de la app).
   */
  setColor(hexColor: string) {
    const color = new THREE.Color(hexColor);
    this.lengthMeasure.color = color;
  }

  /**
   * Cancela la creación en progreso (por ejemplo si el usuario presiona Esc).
   */
  cancel() {
    if (this.currentMode === 'length') {
      this.lengthMeasure.cancelCreation();
    } else if (this.currentMode === 'angle') {
      this.angleMeasure.cancelCreation();
    } else if (this.currentMode === 'area') {
      this.areaMeasure.cancelCreation();
    }
  }

  /**
   * Borra la medición que se encuentra actualmente seleccionada o bajo el puntero.
   */
  deleteSelected() {
    if (this.currentMode === 'length') {
      this.lengthMeasure.delete();
    } else if (this.currentMode === 'angle') {
      this.angleMeasure.delete();
    } else if (this.currentMode === 'area') {
      this.areaMeasure.delete();
    }
  }

  /**
   * Deshabilita la captura de eventos de todas las herramientas.
   */
  private disableAll() {
    this.lengthMeasure.enabled = false;
    this.angleMeasure.enabled = false;
    this.areaMeasure.enabled = false;
    this.currentMode = 'none';
  }
}
