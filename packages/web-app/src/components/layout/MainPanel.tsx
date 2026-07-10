import React, { useState } from 'react';
import styles from './MainPanel.module.css';
import { MuroVisualizer } from '../visualizer/MuroVisualizer';
import { Button } from '../ui/Button';
import { serializeState } from '../../hooks/useCalculadora';
import type { MuroFormData } from '../../hooks/useCalculadora';
import type { ResultadoMuro, Abertura, Catalogo } from '@drywall-calc/catalog-schemas';
import type { CalculationState } from '../../hooks/useCalculadora';

interface MainPanelProps {
  resultado: ResultadoMuro | null;
  state: CalculationState;
  errorMsg: string;
  largo_m: number;
  alto_m: number;
  aberturas: Abertura[];
  carasConfig: 1 | 2;
  capasConfig: number;
  form: MuroFormData;
  catalogo: Catalogo;
}

export const MainPanel: React.FC<MainPanelProps> = ({
  resultado,
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

  // 1. Calculate detailed quantities and weights
  const getMaterialRows = (r: ResultadoMuro) => {
    // Plates weight is directly from calculation
    const placasPeso = r.placas.peso_total_kg;

    // Montantes weight: count * weight/ml * length (3.00m)
    const montanteConfig = catalogo.perfiles.montante.find((m) => m.codigo === form.perfil);
    const montantePesoMl = montanteConfig ? montanteConfig.peso_kg_ml : 0.52;
    const montantesPeso = r.perfiles.montantes * montantePesoMl * 3.00;

    // Rieles weight: count * weight/ml * length (3.00m)
    const rielConfig = catalogo.perfiles.riel.find((riel) => riel.codigo === form.riel);
    const rielPesoMl = rielConfig ? rielConfig.peso_kg_ml : 0.49;
    const rielesPeso = r.perfiles.rieles_barras * rielPesoMl * 3.00;

    // Screws weights: Plate-profile 1.5g, profile-profile 1.0g, anchors 15.0g
    const tornillosPlacaPeso = r.tornillos.placa_perfil * 0.0015;
    const tornillosPerfilPeso = r.tornillos.perfil_perfil * 0.001;
    const anclajesPeso = r.tornillos.anclajes_losa * 0.015;

    // Tape: roll weight ~0.40kg
    const cintaPeso = r.cinta.rollos * 0.40;

    // Masilla: bag weight ~25kg
    const masillaPeso = r.masilla.kg_total; // Or bags * 25.0, let's use exact masilla kg consumed

    // Aislante: pack weight ~6.00kg
    const aislantePeso = r.aislante.paquetes * 6.00;

    // Esquineros: ~0.46kg per meter
    const esquinerosPeso = r.esquineros.ml_total * 0.46;

    const rows = [
      {
        grupo: 'Placas',
        nombre: `Placa ${form.placa_tipo} (${form.placa_espesor_mm}mm)`,
        cantidad: `${r.placas.cantidad_total} und`,
        detalle: `Formato ${form.placa_formato}m (Orientación ${form.placa_orientacion})`,
        peso: placasPeso,
      },
      {
        grupo: 'Estructura',
        nombre: `Perfil Montante ${form.perfil}`,
        cantidad: `${r.perfiles.montantes} barras`,
        detalle: `Perfil vertical, barras de 3.00m de longitud`,
        peso: montantesPeso,
      },
      {
        grupo: 'Estructura',
        nombre: `Perfil Riel ${form.riel}`,
        cantidad: `${r.perfiles.rieles_barras} barras`,
        detalle: `Perfil horizontal guía, barras de 3.00m`,
        peso: rielesPeso,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Placa-Perfil',
        cantidad: `${r.tornillos.placa_perfil} und`,
        detalle: `Fijación de placas a la estructura de chapa`,
        peso: tornillosPlacaPeso,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Tornillos Perfil-Perfil',
        cantidad: `${r.tornillos.perfil_perfil} und`,
        detalle: `Fijación de montante a riel (T1 cabeza aguja)`,
        peso: tornillosPerfilPeso,
      },
      {
        grupo: 'Fijaciones',
        nombre: 'Anclajes a Losa',
        cantidad: `${r.tornillos.anclajes_losa} und`,
        detalle: `Fijación de riel a piso/techo (tarugo 8 + tornillo)`,
        peso: anclajesPeso,
      },
      {
        grupo: 'Acabados',
        nombre: 'Cinta de papel',
        cantidad: `${r.cinta.rollos} rollo${r.cinta.rollos !== 1 ? 's' : ''}`,
        detalle: `Tratamiento de juntas secundarias (${r.cinta.ml_total.toFixed(1)} ml netos)`,
        peso: cintaPeso,
      },
      {
        grupo: 'Acabados',
        nombre: 'Masilla lista para usar',
        cantidad: `${r.masilla.bolsas} bolsa${r.masilla.bolsas !== 1 ? 's' : ''}`,
        detalle: `Tomado de juntas y terminación (${r.masilla.kg_total.toFixed(1)} kg)`,
        peso: masillaPeso,
      },
    ];

    if (r.aislante.paquetes > 0) {
      rows.push({
        grupo: 'Aislante',
        nombre: 'Aislante lana de vidrio',
        cantidad: `${r.aislante.paquetes} paquete${r.aislante.paquetes !== 1 ? 's' : ''}`,
        detalle: `Aislación termoacústica interna (${r.aislante.m2.toFixed(1)} m²)`,
        peso: aislantePeso,
      });
    }

    if (r.esquineros.ml_total > 0) {
      rows.push({
        grupo: 'Acabados',
        nombre: 'Esquinero metálico',
        cantidad: `${r.esquineros.ml_total.toFixed(1)} ml`,
        detalle: `Protección de esquinas externas expuestas`,
        weight: esquinerosPeso,
      } as any);
    }

    return rows;
  };

  const calculateTotalWeight = (rows: ReturnType<typeof getMaterialRows>) => {
    return rows.reduce((acc, row) => acc + (row.peso || 0), 0);
  };

  // 2. Export to CSV
  const handleExportCSV = () => {
    if (!resultado) return;
    const rows = getMaterialRows(resultado);
    const headers = ['Grupo', 'Material', 'Cantidad', 'Detalle Técnico', 'Peso Estimado (kg)'];
    
    const csvContent = [
      headers.join(';'),
      ...rows.map((row) =>
        [
          row.grupo,
          row.nombre,
          row.cantidad,
          row.detalle,
          row.peso ? row.peso.toFixed(2) : '0.00',
        ].join(';')
      ),
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xef, 0xbb, 0xbf]), csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `presupuesto_muro_${form.largo_m}x${form.alto_m}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Export to PDF (Print view)
  const handlePrintPDF = () => {
    window.print();
  };

  // 4. Share link
  const handleShareLink = () => {
    const serialized = serializeState(form);
    const shareUrl = `${window.location.origin}${window.location.pathname}?${serialized}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  };

  const rows = resultado ? getMaterialRows(resultado) : [];
  const totalWeight = resultado ? calculateTotalWeight(rows) : 0;

  return (
    <main className={styles.main}>
      {/* ---- Empty state ---- */}
      {state === 'idle' && !resultado && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📐</div>
          <h2 className={styles.emptyTitle}>Configurá tu muro</h2>
          <p className={styles.emptyText}>
            Completá los datos en el panel izquierdo y presioná{' '}
            <strong>Calcular materiales</strong> para obtener el cómputo exacto.
          </p>
          <div className={styles.featureGrid}>
            {[
              { icon: '🟦', label: 'Placas y nesting' },
              { icon: '🏗️', label: 'Perfiles y rieles' },
              { icon: '🔩', label: 'Tornillería exacta' },
              { icon: '🧶', label: 'Cinta, masilla, aislante' },
              { icon: '🪟', label: 'Soporte de aberturas' },
              { icon: '📊', label: 'Trazabilidad completa' },
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
          {/* Visualizador 2D SVG */}
          <MuroVisualizer
            resultado={resultado}
            largo_m={largo_m}
            alto_m={alto_m}
            aberturas={aberturas}
            carasConfig={carasConfig}
            capasConfig={capasConfig}
          />

          <div className={styles.resultsHeader}>
            <div>
              <h2 className={styles.resultsTitle}>Resultado del cómputo</h2>
              <p className={styles.resultsSubtitle}>Detalle técnico e insumos para cotización</p>
            </div>
            
            <div className={`${styles.actions} no-print`}>
              <Button id="btn-share" variant="secondary" size="sm" onClick={handleShareLink}>
                🔗 {copySuccess ? '¡Enlace copiado!' : 'Compartir'}
              </Button>
              <Button id="btn-export-csv" variant="secondary" size="sm" onClick={handleExportCSV}>
                📥 CSV
              </Button>
              <Button id="btn-export-pdf" variant="primary" size="sm" onClick={handlePrintPDF}>
                🖨️ PDF
              </Button>
            </div>
          </div>

          {copySuccess && (
            <div className={styles.shareAlert}>
              🚀 <strong>¡Enlace de compartición copiado al portapapeles!</strong> Podés enviarlo a tus clientes o equipo para ver este muro exacto.
            </div>
          )}

          {/* Resumen de Carga y Pesos */}
          <div className={styles.weightCard}>
            <div className={styles.weightHeader}>
              <span className={styles.weightIcon}>⚖️</span>
              <div>
                <span className={styles.weightTitle}>Peso Estructural Estimado</span>
                <p className={styles.weightDesc}>Carga total aproximada a transmitir a losas/vigas</p>
              </div>
            </div>
            <div className={styles.weightValue}>{totalWeight.toFixed(1)} kg</div>
          </div>

          {/* Tabla de Materiales */}
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
                {rows.map((row, idx) => (
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
              {resultado.trazabilidad.map((t, i) => (
                <div key={i} className={styles.trazabilidadItem}>
                  <span className={styles.trazabilidadNum}>{i + 1}</span>
                  <span className={styles.trazabilidadText}>{t}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </main>
  );
};
