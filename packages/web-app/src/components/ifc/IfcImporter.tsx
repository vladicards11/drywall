import React, { useState, useRef, useCallback } from 'react';
import styles from './IfcImporter.module.css';
import type { IfcImportResult, MuroIFC, UnionIFC } from '@drywall-calc/ifc-importer';

interface IfcImporterProps {
  /** Callback al importar muros seleccionados y uniones detectadas */
  onImportarMuros: (muros: MuroIFC[], uniones?: UnionIFC[]) => void;
  /** Callback para cerrar el panel */
  onCerrar: () => void;
}

type EstadoParseo = 'idle' | 'cargando' | 'listo' | 'error';

export const IfcImporter: React.FC<IfcImporterProps> = ({ onImportarMuros, onCerrar }) => {
  const [estado, setEstado] = useState<EstadoParseo>('idle');
  const [resultado, setResultado] = useState<IfcImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [seleccionados, setSeleccionados] = useState<Set<number>>(new Set());
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const procesarArchivo = useCallback(async (file: File) => {
    if (!file.name.endsWith('.ifc')) {
      setErrorMsg('Por favor seleccioná un archivo .ifc válido.');
      setEstado('error');
      return;
    }

    setNombreArchivo(file.name);
    setEstado('cargando');
    setResultado(null);
    setErrorMsg('');

    try {
      const buffer = await file.arrayBuffer();
      // Import dinámico para no bloquear el cargado inicial de la app
      const { parseIFC } = await import('@drywall-calc/ifc-importer');
      const res = await parseIFC(buffer);
      res.nombreArchivo = file.name;
      setResultado(res);
      // Pre-seleccionar todos los muros
      setSeleccionados(new Set(res.muros.map((_, i) => i)));
      setEstado('listo');
    } catch (e) {
      setErrorMsg(`Error al parsear el archivo IFC: ${e}`);
      setEstado('error');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) procesarArchivo(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) procesarArchivo(file);
  };

  const toggleSeleccion = (idx: number) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleTodos = () => {
    if (!resultado) return;
    if (seleccionados.size === resultado.muros.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(resultado.muros.map((_, i) => i)));
    }
  };

  const handleImportar = () => {
    if (!resultado) return;
    const murosSeleccionados = resultado.muros.filter((_, i) => seleccionados.has(i));
    const idsSeleccionados = new Set(murosSeleccionados.map(m => m.expressId));
    const unionesFiltradas = (resultado.uniones || []).filter(u => 
      idsSeleccionados.has(u.muros_conectados[0]) && idsSeleccionados.has(u.muros_conectados[1])
    );
    onImportarMuros(murosSeleccionados, unionesFiltradas);
    onCerrar();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>📐</span>
          <div>
            <h2 className={styles.headerTitle}>Importador IFC</h2>
            <p className={styles.headerSub}>Cargá un archivo .ifc para extraer muros automáticamente</p>
          </div>
        </div>
        <button className={styles.btnCerrar} onClick={onCerrar} title="Cerrar">✕</button>
      </div>

      {/* ---- Dropzone ---- */}
      {estado === 'idle' || estado === 'error' ? (
        <div
          className={`${styles.dropzone} ${isDragging ? styles.dropzoneDragging : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className={styles.dropzoneIcon}>🏗️</div>
          <p className={styles.dropzoneTitle}>
            {isDragging ? 'Soltá el archivo aquí' : 'Arrastrá un archivo .ifc o hacé click'}
          </p>
          <p className={styles.dropzoneSub}>Compatible con IFC2x3 e IFC4 · Revit, ArchiCAD, Allplan</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ifc"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button className={styles.btnSeleccionar}>Seleccionar archivo</button>
          {estado === 'error' && (
            <div className={styles.errorBox}>⚠️ {errorMsg}</div>
          )}
        </div>
      ) : null}

      {/* ---- Cargando ---- */}
      {estado === 'cargando' && (
        <div className={styles.cargando}>
          <div className={styles.spinner} />
          <p className={styles.cargandoTitle}>Parseando <strong>{nombreArchivo}</strong>…</p>
          <p className={styles.cargandoSub}>Inicializando motor WASM y extrayendo muros del modelo</p>
        </div>
      )}

      {/* ---- Resultado ---- */}
      {estado === 'listo' && resultado && (
        <div className={styles.resultado}>
          {/* Cabecera del resultado */}
          <div className={styles.resultadoHeader}>
            <div className={styles.resultadoMeta}>
              <span className={styles.archivoBadge}>📄 {resultado.nombreArchivo}</span>
              {resultado.nombreProyecto && (
                <span className={styles.proyectoBadge}>🏢 {resultado.nombreProyecto}</span>
              )}
              <span className={styles.schemaBadge}>{resultado.schemaVersion}</span>
            </div>
            <div className={styles.resultadoStats}>
              <span className={styles.statItem}>
                <strong>{resultado.muros.length}</strong> muros detectados
              </span>
              <span className={styles.statItem}>
                <strong>{seleccionados.size}</strong> seleccionados
              </span>
            </div>
          </div>

          {/* Advertencias globales */}
          {resultado.advertencias.length > 0 && (
            <div className={styles.advertencias}>
              {resultado.advertencias.map((adv, i) => (
                <div key={i} className={styles.advertencia}>⚠️ {adv}</div>
              ))}
            </div>
          )}

          {/* Tabla de muros */}
          <div className={styles.tableContainer}>
            <div className={styles.tableHeader}>
              <label className={styles.selectAllLabel}>
                <input
                  type="checkbox"
                  checked={seleccionados.size === resultado.muros.length && resultado.muros.length > 0}
                  onChange={toggleTodos}
                  className={styles.checkbox}
                />
                Seleccionar todos
              </label>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>✓</th>
                  <th>#</th>
                  <th>Nombre / ID</th>
                  <th>Largo</th>
                  <th>Alto</th>
                  <th>Aberturas</th>
                  <th>Datos</th>
                </tr>
              </thead>
              <tbody>
                {resultado.muros.map((muro, idx) => (
                  <tr
                    key={muro.expressId}
                    className={`${styles.row} ${seleccionados.has(idx) ? styles.rowSeleccionado : ''}`}
                    onClick={() => toggleSeleccion(idx)}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={seleccionados.has(idx)}
                        onChange={() => toggleSeleccion(idx)}
                        onClick={(e) => e.stopPropagation()}
                        className={styles.checkbox}
                      />
                    </td>
                    <td className={styles.muroNum}>#{idx + 1}</td>
                    <td className={styles.muroNombre}>
                      {muro.nombre ?? `Muro #${muro.expressId}`}
                    </td>
                    <td className={styles.muroDim}>{muro.largo_m.toFixed(2)} m</td>
                    <td className={styles.muroDim}>{muro.alto_m.toFixed(2)} m</td>
                    <td className={styles.muroAberturas}>
                      {muro.aberturas.length === 0 ? (
                        <span className={styles.sinAberturas}>—</span>
                      ) : (
                        <>
                          {muro.aberturas.map((ab, ai) => (
                            <span key={ai} className={`${styles.aberturaBadge} ${styles[ab.tipo]}`}>
                              {ab.tipo === 'puerta' ? '🚪' : ab.tipo === 'ventana' ? '🪟' : '⬜'}
                              {ab.ancho_m.toFixed(2)}×{ab.alto_m.toFixed(2)}
                            </span>
                          ))}
                        </>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.metodoBadge} ${muro.metodo_extraccion === 'quantity_sets' ? styles.metodoSeguro : styles.metodoEstimado}`}>
                        {muro.metodo_extraccion === 'quantity_sets' ? '✅ QS' : '📐 BBox'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Leyenda */}
          <div className={styles.leyenda}>
            <span className={styles.leyendaItem}><span className={`${styles.metodoBadge} ${styles.metodoSeguro}`}>✅ QS</span> Datos desde Quantity Sets (alta precisión)</span>
            <span className={styles.leyendaItem}><span className={`${styles.metodoBadge} ${styles.metodoEstimado}`}>📐 BBox</span> Datos estimados por bounding box</span>
          </div>

          {/* Acciones */}
          <div className={styles.acciones}>
            <button
              className={styles.btnCancelar}
              onClick={() => { setEstado('idle'); setResultado(null); }}
            >
              ← Cargar otro archivo
            </button>
            <button
              className={styles.btnImportar}
              onClick={handleImportar}
              disabled={seleccionados.size === 0}
            >
              📥 Importar {seleccionados.size} muro{seleccionados.size !== 1 ? 's' : ''} seleccionado{seleccionados.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IfcImporter;
