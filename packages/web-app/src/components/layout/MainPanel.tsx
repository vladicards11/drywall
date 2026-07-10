import React, { useState } from 'react';
import styles from './MainPanel.module.css';
import { MuroVisualizer } from '../visualizer/MuroVisualizer';
import { Button } from '../ui/Button';
import type { MuroFormData } from '../../hooks/useCalculadora';
import type { ProyectoFormData } from '../../hooks/useProyecto';
import type { ResultadoMuro, ResultadoProyecto, Abertura, Catalogo } from '@drywall-calc/catalog-schemas';
import type { CalculationState } from '../../hooks/useCalculadora';

interface MainPanelProps {
  // Multi-muro
  proyecto: ProyectoFormData;
  selectedMuroIdx: number;
  resultado: ResultadoProyecto | null;
  currentResultadoMuro: ResultadoMuro | null;
  totalPlacasConDesperdicio: number;
  onUpdateFactor: (pct: number) => void;
  onCompartir: () => string;
  // State
  state: CalculationState;
  errorMsg: string;
  // For visualizer (current wall)
  largo_m: number;
  alto_m: number;
  aberturas: Abertura[];
  carasConfig: 1 | 2;
  capasConfig: number;
  form: MuroFormData;
  catalogo: Catalogo;
}

type ViewTab = 'proyecto' | 'muro';

export const MainPanel: React.FC<MainPanelProps> = ({
  proyecto,
  selectedMuroIdx,
  resultado,
  currentResultadoMuro,
  totalPlacasConDesperdicio,
  onUpdateFactor,
  onCompartir,
  state,
  errorMsg,
  largo_m,
  alto_m,
  aberturas,
  carasConfig,
  capasConfig,
  form,
  catalogo,
}) => {
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<ViewTab>('proyecto');

  // ---- Material rows for a single muro ----
  const getMaterialRows = (r: ResultadoMuro, f: MuroFormData) => {
    const montanteConfig = catalogo.perfiles.montante.find((m) => m.codigo === f.perfil);
    const montantePesoMl = montanteConfig ? montanteConfig.peso_kg_ml : 0.52;
    const rielConfig = catalogo.perfiles.riel.find((riel) => riel.codigo === f.riel);
    const rielPesoMl = rielConfig ? rielConfig.peso_kg_ml : 0.49;

    const rows = [
      {
        grupo: 'Placas',
        nombre: `Placa ${f.placa_tipo} (${f.placa_espesor_mm}mm)`,
        cantidad: `${r.placas.cantidad_total} und`,
        detalle: `Formato ${f.placa_formato}m (Orientación ${f.placa_orientacion})`,
        peso: r.placas.peso_total_kg,
      },
      {
        grupo: 'Estructura',
        nombre: `Perfil Montante ${f.perfil}`,
        cantidad: `${r.perfiles.montantes} barras`,
        detalle: `Perfil vertical, barras de 3.00m`,
        peso: r.perfiles.montantes * montantePesoMl * 3.0,
      },
      {
        grupo: 'Estructura',
        nombre: `Perfil Riel ${f.riel}`,
        cantidad: `${r.perfiles.rieles_barras} barras`,
        detalle: `Perfil horizontal guía, barras de 3.00m`,
        peso: r.perfiles.rieles_barras * rielPesoMl * 3.0,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Placa-Perfil',
        cantidad: `${r.tornillos.placa_perfil} und`,
        detalle: `Fijación de placas a la estructura`,
        peso: r.tornillos.placa_perfil * 0.0015,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Perfil-Perfil',
        cantidad: `${r.tornillos.perfil_perfil} und`,
        detalle: `Fijación de montante a riel`,
        peso: r.tornillos.perfil_perfil * 0.001,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Anclajes a Losa',
        cantidad: `${r.tornillos.anclajes_losa} und`,
        detalle: `Fijación de riel a piso/techo`,
        peso: r.tornillos.anclajes_losa * 0.015,
      },
      {
        grupo: 'Acabados',
        nombre: 'Cinta de papel',
        cantidad: `${r.cinta.rollos} rollo${r.cinta.rollos !== 1 ? 's' : ''}`,
        detalle: `Tratamiento de juntas (${r.cinta.ml_total.toFixed(1)} ml)`,
        peso: r.cinta.rollos * 0.40,
      },
      {
        grupo: 'Acabados',
        nombre: 'Masilla lista para usar',
        cantidad: `${r.masilla.bolsas} bolsa${r.masilla.bolsas !== 1 ? 's' : ''}`,
        detalle: `Tomado de juntas (${r.masilla.kg_total.toFixed(1)} kg)`,
        peso: r.masilla.kg_total,
      },
    ];

    if (r.aislante.paquetes > 0) {
      rows.push({
        grupo: 'Aislante',
        nombre: 'Aislante lana de vidrio',
        cantidad: `${r.aislante.paquetes} paquete${r.aislante.paquetes !== 1 ? 's' : ''}`,
        detalle: `Aislación termoacústica (${r.aislante.m2.toFixed(1)} m²)`,
        peso: r.aislante.paquetes * 6.0,
      });
    }
    if (r.esquineros.ml_total > 0) {
      rows.push({
        grupo: 'Acabados',
        nombre: 'Esquinero metálico',
        cantidad: `${r.esquineros.ml_total.toFixed(1)} ml`,
        detalle: `Protección de esquinas externas`,
        peso: r.esquineros.ml_total * 0.46,
      });
    }
    return rows;
  };

  const totalWeight = (rows: ReturnType<typeof getMaterialRows>) =>
    rows.reduce((acc, r) => acc + (r.peso || 0), 0);

  // ---- Export CSV (proyecto completo) ----
  const handleExportCSV = () => {
    if (!resultado) return;
    const t = resultado.totales;
    const lines = [
      'PROYECTO;' + proyecto.nombre,
      'MUROS;' + resultado.muros.length,
      '',
      'Grupo;Material;Cantidad;Detalle',
      `Placas;Total placas netas;${t.placas.cantidad_total} und;Suma de todos los muros`,
      `Placas;Total placas con ${proyecto.factor_desperdicio_pct}% desperdicio;${totalPlacasConDesperdicio} und;Para compra`,
      `Estructura;Montantes;${t.perfiles.montantes} barras;`,
      `Estructura;Rieles;${t.perfiles.rieles_barras} barras;`,
      `Fijaciones;Tornillos Placa-Perfil;${t.tornillos.placa_perfil} und;`,
      `Fijaciones;Tornillos Perfil-Perfil;${t.tornillos.perfil_perfil} und;`,
      `Fijaciones;Anclajes a Losa;${t.tornillos.anclajes_losa} und;`,
      `Acabados;Cinta de papel;${t.cinta.rollos} rollos;${t.cinta.ml_total.toFixed(1)} ml`,
      `Acabados;Masilla;${t.masilla.bolsas} bolsas;${t.masilla.kg_total.toFixed(1)} kg`,
      `Aislante;Aislante;${t.aislante.paquetes} paquetes;${t.aislante.m2.toFixed(1)} m²`,
      `Acabados;Esquineros;${t.esquineros.ml_total.toFixed(1)} ml;`,
      '',
      'DETALLE POR MURO',
    ];

    resultado.muros.forEach((rm, idx) => {
      const mf = proyecto.muros[idx];
      lines.push(`Muro #${idx + 1};${mf?.largo_m ?? '?'}×${mf?.alto_m ?? '?'}m`);
      lines.push(`  Placas;${rm.placas.cantidad_total} und`);
      lines.push(`  Montantes;${rm.perfiles.montantes} barras`);
    });

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `presupuesto_proyecto_${resultado.muros.length}_muros.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---- Share ----
  const handleShare = () => {
    onCompartir();
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  // ---- Render ----
  const muroRows =
    currentResultadoMuro ? getMaterialRows(currentResultadoMuro, form) : [];
  const muroWeight = totalWeight(muroRows);

  return (
    <main className={styles.main}>
      {/* ---- Empty state ---- */}
      {state === 'idle' && !resultado && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📐</div>
          <h2 className={styles.emptyTitle}>Configurá tu proyecto</h2>
          <p className={styles.emptyText}>
            Agregá uno o más muros en el panel izquierdo y presioná{' '}
            <strong>Calcular materiales</strong> para obtener el cómputo exacto.
          </p>
          <div className={styles.featureGrid}>
            {[
              { icon: '🟦', label: 'Placas y nesting' },
              { icon: '🏗️', label: 'Perfiles y rieles' },
              { icon: '🔩', label: 'Tornillería exacta' },
              { icon: '🧶', label: 'Cinta, masilla, aislante' },
              { icon: '🔗', label: 'Uniones entre muros' },
              { icon: '📊', label: 'Consolidado de proyecto' },
            ].map((f) => (
              <div key={f.label} className={styles.featureCard}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <span className={styles.featureLabel}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Calculating ---- */}
      {state === 'calculating' && (
        <div className={styles.centerState}>
          <div className={styles.spinner} />
          <p className="text-secondary">Calculando materiales…</p>
        </div>
      )}

      {/* ---- Error ---- */}
      {state === 'error' && (
        <div className={styles.errorState}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>Error en el cálculo</h2>
          <p className={styles.errorMsg}>{errorMsg}</p>
        </div>
      )}

      {/* ---- Results ---- */}
      {state === 'done' && resultado && (
        <div className={`${styles.results} animate-fade-in`}>
          {/* Header + actions */}
          <div className={styles.resultsHeader}>
            <div>
              <h2 className={styles.resultsTitle}>Resultado del cómputo</h2>
              <p className={styles.resultsSubtitle}>
                {resultado.muros.length} muro{resultado.muros.length !== 1 ? 's' : ''} · {proyecto.nombre}
              </p>
            </div>
            <div className={`${styles.actions} no-print`}>
              <Button id="btn-share" variant="secondary" size="sm" onClick={handleShare}>
                🔗 {copySuccess ? '¡Enlace copiado!' : 'Compartir'}
              </Button>
              <Button id="btn-export-csv" variant="secondary" size="sm" onClick={handleExportCSV}>
                📥 CSV
              </Button>
              <Button id="btn-export-pdf" variant="primary" size="sm" onClick={() => window.print()}>
                🖨️ PDF
              </Button>
            </div>
          </div>

          {copySuccess && (
            <div className={styles.shareAlert}>
              🚀 <strong>¡Enlace de compartición copiado al portapapeles!</strong> Podés enviarlo a tus clientes o equipo para reproducir este proyecto.
            </div>
          )}

          {/* Tabs */}
          <div className={`${styles.tabs} no-print`}>
            <button
              className={`${styles.tab} ${activeTab === 'proyecto' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('proyecto')}
            >
              📋 Vista Proyecto ({resultado.muros.length})
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'muro' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('muro')}
            >
              🟦 Muro #{selectedMuroIdx + 1}
            </button>
          </div>

          {/* ==================== TAB: PROYECTO ==================== */}
          {activeTab === 'proyecto' && (
            <div className={`${styles.tabContent} print-only-project`}>
              {/* Factor desperdicio */}
              <div className={styles.desperdicioCard}>
                <div className={styles.desperdicioHeader}>
                  <span>🗑️ Factor de desperdicio</span>
                  <span className={styles.desperdicioValue}>{proyecto.factor_desperdicio_pct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={proyecto.factor_desperdicio_pct}
                  onChange={(e) => onUpdateFactor(Number(e.target.value))}
                  className={`${styles.desperdicioSlider} no-print`}
                />
                <div className={styles.desperdicioInfo}>
                  Placas netas: <strong>{resultado.totales.placas.cantidad_total}</strong> und →
                  Con desperdicio: <strong className={styles.desperdicioHighlight}>{totalPlacasConDesperdicio}</strong> und a comprar
                </div>
              </div>

              {/* Peso total */}
              <div className={styles.weightCard}>
                <div className={styles.weightHeader}>
                  <span className={styles.weightIcon}>⚖️</span>
                  <div>
                    <span className={styles.weightTitle}>Peso Estructural Total del Proyecto</span>
                    <p className={styles.weightDesc}>Suma de carga de todos los muros</p>
                  </div>
                </div>
                <div className={styles.weightValue}>{resultado.totales.placas.peso_total_kg.toFixed(1)} kg</div>
              </div>

              {/* Tabla consolidada */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Material / Insumo</th>
                      <th style={{ textAlign: 'right' }}>Total Proyecto</th>
                      <th style={{ textAlign: 'right' }}>Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { grupo: 'Placas', nombre: 'Placas (neto)', qty: resultado.totales.placas.cantidad_total, unit: 'und' },
                      { grupo: 'Placas', nombre: `Placas (+ ${proyecto.factor_desperdicio_pct}% desperdicio)`, qty: totalPlacasConDesperdicio, unit: 'und' },
                      { grupo: 'Estructura', nombre: 'Montantes', qty: resultado.totales.perfiles.montantes, unit: 'barras' },
                      { grupo: 'Estructura', nombre: 'Rieles', qty: resultado.totales.perfiles.rieles_barras, unit: 'barras' },
                      { grupo: 'Estructura', nombre: 'Refuerzo en vanos', qty: resultado.totales.perfiles.montantes_refuerzo_vanos, unit: 'barras' },
                      { grupo: 'Fijaciones', nombre: 'Tornillos Placa-Perfil', qty: resultado.totales.tornillos.placa_perfil, unit: 'und' },
                      { grupo: 'Fijaciones', nombre: 'Tornillos Perfil-Perfil', qty: resultado.totales.tornillos.perfil_perfil, unit: 'und' },
                      { grupo: 'Fijaciones', nombre: 'Anclajes a Losa', qty: resultado.totales.tornillos.anclajes_losa, unit: 'und' },
                      { grupo: 'Acabados', nombre: 'Cinta de papel', qty: resultado.totales.cinta.rollos, unit: 'rollos' },
                      { grupo: 'Acabados', nombre: 'Masilla', qty: resultado.totales.masilla.bolsas, unit: 'bolsas' },
                      { grupo: 'Aislante', nombre: 'Aislante lana de vidrio', qty: resultado.totales.aislante.paquetes, unit: 'paquetes' },
                      { grupo: 'Acabados', nombre: 'Esquineros metálicos', qty: parseFloat(resultado.totales.esquineros.ml_total.toFixed(1)), unit: 'ml' },
                    ].map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`${styles.badge} ${styles[row.grupo.toLowerCase()] || ''}`}>
                            {row.grupo}
                          </span>
                        </td>
                        <td className={styles.materialName}>{row.nombre}</td>
                        <td className={styles.materialQty}>{row.qty}</td>
                        <td className={styles.materialDetail}>{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Desglose por muro */}
              {resultado.muros.length > 1 && (
                <details className={styles.trazabilidad}>
                  <summary className={styles.trazabilidadSummary}>
                    🏗️ Ver desglose por muro ({resultado.muros.length} muros)
                  </summary>
                  <div className={styles.trazabilidadList}>
                    {resultado.muros.map((rm, idx) => {
                      const mf = proyecto.muros[idx];
                      return (
                        <div key={idx} className={styles.trazabilidadItem}>
                          <span className={styles.trazabilidadNum}>#{idx + 1}</span>
                          <span className={styles.trazabilidadText}>
                            <strong>Muro {idx + 1}</strong> ({mf?.largo_m ?? '?'}×{mf?.alto_m ?? '?'}m):&nbsp;
                            {rm.placas.cantidad_total} placas · {rm.perfiles.montantes} montantes · {rm.perfiles.rieles_barras} rieles
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* ==================== TAB: MURO ==================== */}
          {activeTab === 'muro' && currentResultadoMuro && (
            <div className={styles.tabContent}>
              {/* SVG Visualizer */}
              <MuroVisualizer
                resultado={currentResultadoMuro}
                largo_m={largo_m}
                alto_m={alto_m}
                aberturas={aberturas}
                carasConfig={carasConfig}
                capasConfig={capasConfig}
              />

              {/* Peso muro */}
              <div className={styles.weightCard}>
                <div className={styles.weightHeader}>
                  <span className={styles.weightIcon}>⚖️</span>
                  <div>
                    <span className={styles.weightTitle}>Peso Estructural Estimado — Muro #{selectedMuroIdx + 1}</span>
                    <p className={styles.weightDesc}>Carga total aproximada a transmitir a losas/vigas</p>
                  </div>
                </div>
                <div className={styles.weightValue}>{muroWeight.toFixed(1)} kg</div>
              </div>

              {/* Tabla muro */}
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Material / Insumo</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th>Detalle Técnico</th>
                      <th style={{ textAlign: 'right' }}>Peso Est.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {muroRows.map((row, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className={`${styles.badge} ${styles[row.grupo.toLowerCase()] || ''}`}>
                            {row.grupo}
                          </span>
                        </td>
                        <td className={styles.materialName}>{row.nombre}</td>
                        <td className={styles.materialQty}>{row.cantidad}</td>
                        <td className={styles.materialDetail}>{row.detalle}</td>
                        <td className={styles.materialWeight}>
                          {row.peso ? `${row.peso.toFixed(1)} kg` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Trazabilidad */}
              <details className={styles.trazabilidad}>
                <summary className={styles.trazabilidadSummary}>
                  📋 Ver trazabilidad y fórmulas matemáticas
                </summary>
                <div className={styles.trazabilidadList}>
                  {currentResultadoMuro.trazabilidad.map((t, i) => (
                    <div key={i} className={styles.trazabilidadItem}>
                      <span className={styles.trazabilidadNum}>{i + 1}</span>
                      <span className={styles.trazabilidadText}>{t}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </main>
  );
};
