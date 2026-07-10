import React, { useRef } from 'react';
import styles from './HistorialPanel.module.css';
import type { ProyectoFormData, HistorialItem } from '../../hooks/useProyecto';

interface HistorialPanelProps {
  proyecto: ProyectoFormData;
  historial: HistorialItem[];
  onUpdateNombre: (nombre: string) => void;
  onUpdateCatalogoSistema: (sistema: string) => void;
  onGuardarEnHistorial: () => void;
  onCargarDesdeHistorial: (id: string) => void;
  onEliminarDeHistorial: (id: string) => void;
  onImportarProyecto: (datos: ProyectoFormData) => void;
}

export const HistorialPanel: React.FC<HistorialPanelProps> = ({
  proyecto,
  historial,
  onUpdateNombre,
  onUpdateCatalogoSistema,
  onGuardarEnHistorial,
  onCargarDesdeHistorial,
  onEliminarDeHistorial,
  onImportarProyecto,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Export JSON ----
  const handleExportJSON = () => {
    const rawData = JSON.stringify(proyecto, null, 2);
    const blob = new Blob([rawData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${proyecto.nombre.replace(/\s+/g, '_') || 'proyecto'}_backup.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ---- Import JSON ----
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as ProyectoFormData;
        if (parsed && Array.isArray(parsed.muros)) {
          onImportarProyecto(parsed);
        } else {
          alert('El archivo JSON no tiene el formato correcto de proyecto.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (e.target) e.target.value = '';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>💾 Gestión de Proyecto</span>
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Nombre de Obra / Proyecto</label>
        <input
          id="input-proyecto-nombre"
          type="text"
          className={styles.input}
          value={proyecto.nombre}
          placeholder="Ej: Casa Martinez - Planta Alta"
          onChange={(e) => onUpdateNombre(e.target.value)}
        />
      </div>

      <div className={styles.formRow}>
        <label className={styles.label}>Catálogo / Sistema de Referencia</label>
        <select
          id="select-catalogo-sistema"
          className={styles.select}
          value={proyecto.catalogo_sistema}
          onChange={(e) => onUpdateCatalogoSistema(e.target.value)}
        >
          <option value="generico_estandar">Genérico Estándar</option>
          <option value="gyplac_superboard">Gyplac / Superboard (Eternit Perú)</option>
          <option value="tupemesa_precor">Tupemesa / Precor (Perfiles Perú)</option>
        </select>
        {proyecto.catalogo_sistema === 'generico_estandar' && (
          <span className={styles.warningText}>
            ⚠️ Usando catálogo genérico. No verificado con marcas locales.
          </span>
        )}
      </div>

      <div className={styles.btnGrid}>
        <button
          id="btn-guardar-historial"
          className={`${styles.btn} ${styles.btnSave}`}
          onClick={onGuardarEnHistorial}
          title="Guardar estado actual en el historial local"
        >
          💾 Guardar
        </button>
        <button
          id="btn-export-json"
          className={styles.btn}
          onClick={handleExportJSON}
          title="Exportar archivo JSON de respaldo"
        >
          📤 Exportar
        </button>
        <button
          id="btn-import-json"
          className={styles.btn}
          onClick={() => fileInputRef.current?.click()}
          title="Importar archivo JSON de respaldo"
        >
          📥 Importar
        </button>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".json"
          onChange={handleImportJSON}
        />
      </div>

      {/* Historial de proyectos */}
      {historial.length > 0 && (
        <div className={styles.historialSection}>
          <span className={styles.subtitle}>Historial Local ({historial.length})</span>
          <div className={styles.list}>
            {historial.map((item) => (
              <div key={item.id} className={styles.item}>
                <div className={styles.itemInfo} onClick={() => onCargarDesdeHistorial(item.id)}>
                  <span className={styles.itemName}>{item.nombre}</span>
                  <span className={styles.itemMeta}>
                    {item.datos.muros.length} muro{item.datos.muros.length !== 1 ? 's' : ''} · {item.timestamp}
                  </span>
                </div>
                <button
                  className={styles.deleteBtn}
                  onClick={() => onEliminarDeHistorial(item.id)}
                  title="Eliminar del historial"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
