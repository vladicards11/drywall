import React from 'react';
import styles from './MainPanel.module.css';
import type { ResultadoMuro } from '@drywall-calc/catalog-schemas';
import type { CalculationState } from '../../hooks/useCalculadora';

interface MainPanelProps {
  resultado: ResultadoMuro | null;
  state: CalculationState;
  errorMsg: string;
}

const MATERIAL_ROWS = [
  { key: 'placas', label: 'Placas', icon: '🟦', getValue: (r: ResultadoMuro) => `${r.placas.cantidad_total} und`, getSub: (r: ResultadoMuro) => `${r.placas.peso_total_kg.toFixed(1)} kg` },
  { key: 'montantes', label: 'Montantes', icon: '⬜', getValue: (r: ResultadoMuro) => `${r.perfiles.montantes} barras`, getSub: (_r: ResultadoMuro) => null },
  { key: 'rieles', label: 'Rieles', icon: '➖', getValue: (r: ResultadoMuro) => `${r.perfiles.rieles_barras} barras`, getSub: (_r: ResultadoMuro) => null },
  { key: 'tornillos_pp', label: 'Tornillos placa-perfil', icon: '🔩', getValue: (r: ResultadoMuro) => `${r.tornillos.placa_perfil} und`, getSub: (_r: ResultadoMuro) => null },
  { key: 'tornillos_perf', label: 'Tornillos perfil-perfil', icon: '🔩', getValue: (r: ResultadoMuro) => `${r.tornillos.perfil_perfil} und`, getSub: (_r: ResultadoMuro) => null },
  { key: 'anclajes', label: 'Anclajes a losa', icon: '⚓', getValue: (r: ResultadoMuro) => `${r.tornillos.anclajes_losa} und`, getSub: (_r: ResultadoMuro) => null },
  { key: 'cinta', label: 'Cinta de papel', icon: '🎞️', getValue: (r: ResultadoMuro) => `${r.cinta.rollos} rollo${r.cinta.rollos !== 1 ? 's' : ''}`, getSub: (r: ResultadoMuro) => `${r.cinta.ml_total.toFixed(1)} ml` },
  { key: 'masilla', label: 'Masilla / Enduído', icon: '🪣', getValue: (r: ResultadoMuro) => `${r.masilla.bolsas} bolsa${r.masilla.bolsas !== 1 ? 's' : ''}`, getSub: (r: ResultadoMuro) => `${r.masilla.kg_total.toFixed(1)} kg` },
  { key: 'aislante', label: 'Aislante', icon: '🧶', getValue: (r: ResultadoMuro) => `${r.aislante.paquetes} paquete${r.aislante.paquetes !== 1 ? 's' : ''}`, getSub: (r: ResultadoMuro) => `${r.aislante.m2.toFixed(1)} m²` },
];

export const MainPanel: React.FC<MainPanelProps> = ({ resultado, state, errorMsg }) => {
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
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>Resultado del cómputo</h2>
            <span className={styles.successBadge}>✓ Calculado</span>
          </div>

          {/* Material cards */}
          <div className={styles.materialsGrid}>
            {MATERIAL_ROWS.map((row) => {
              const sub = row.getSub(resultado);
              return (
                <div key={row.key} className={styles.materialCard}>
                  <span className={styles.materialIcon}>{row.icon}</span>
                  <div className={styles.materialInfo}>
                    <span className={styles.materialLabel}>{row.label}</span>
                    <span className={styles.materialValue}>{row.getValue(resultado)}</span>
                    {sub && <span className={styles.materialSub}>{sub}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trazabilidad */}
          <details className={styles.trazabilidad}>
            <summary className={styles.trazabilidadSummary}>
              📋 Ver trazabilidad del cálculo
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
