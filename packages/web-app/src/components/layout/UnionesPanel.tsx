import React, { useState } from 'react';
import styles from './UnionesPanel.module.css';
import type { UnionFormData } from '../../hooks/useProyecto';
import type { TipologiaUnion } from '@drywall-calc/catalog-schemas';

interface UnionesPanelProps {
  muros: Array<{ largo_m: string; alto_m: string }>;
  uniones: UnionFormData[];
  tipologias: TipologiaUnion[];
  onAdd: (u: UnionFormData) => void;
  onRemove: (id: string) => void;
}

const EMPTY_UNION = {
  muro_a: 'muro_0',
  muro_b: 'muro_1',
  tipo_union: '',
  angulo_grados: 90,
};

export const UnionesPanel: React.FC<UnionesPanelProps> = ({
  muros,
  uniones,
  tipologias,
  onAdd,
  onRemove,
}) => {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_UNION, tipo_union: tipologias[0]?.codigo ?? '' });

  const handleAdd = () => {
    if (form.muro_a === form.muro_b) return;
    const newUnion: UnionFormData = {
      id: `union_${Date.now()}`,
      muro_a: form.muro_a,
      muro_b: form.muro_b,
      tipo_union: form.tipo_union,
      angulo_grados: form.angulo_grados,
    };
    onAdd(newUnion);
    setAdding(false);
    setForm({ ...EMPTY_UNION, tipo_union: tipologias[0]?.codigo ?? '' });
  };

  const muroLabel = (idx: number) => {
    const m = muros[idx];
    if (!m) return `Muro ${idx + 1}`;
    return `Muro #${idx + 1} (${parseFloat(m.largo_m).toFixed(1)}×${parseFloat(m.alto_m).toFixed(1)}m)`;
  };

  if (muros.length < 2) {
    return (
      <div className={styles.emptyNote}>
        💡 Agregá al menos 2 muros para definir uniones entre ellos.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>🔗 Uniones entre muros</span>
        {!adding && (
          <button
            id="btn-add-union"
            className={styles.addBtn}
            onClick={() => setAdding(true)}
          >
            + Agregar unión
          </button>
        )}
      </div>

      {uniones.length === 0 && !adding && (
        <p className={styles.emptyNote}>Sin uniones definidas. Los muros se calculan independientemente.</p>
      )}

      {/* Lista de uniones existentes */}
      {uniones.map((u) => {
        const idxA = parseInt(u.muro_a.replace('muro_', ''));
        const idxB = parseInt(u.muro_b.replace('muro_', ''));
        const tipologia = tipologias.find((t) => t.codigo === u.tipo_union);
        return (
          <div key={u.id} className={styles.unionItem}>
            <div className={styles.unionInfo}>
              <span className={styles.unionTag}>{tipologia?.descripcion ?? u.tipo_union}</span>
              <span className={styles.unionMuros}>
                {muroLabel(idxA)} ↔ {muroLabel(idxB)}
              </span>
              <span className={styles.unionAngle}>{u.angulo_grados}°</span>
            </div>
            <button
              className={styles.removeBtn}
              onClick={() => onRemove(u.id)}
              title="Eliminar unión"
            >
              ×
            </button>
          </div>
        );
      })}

      {/* Formulario para agregar nueva unión */}
      {adding && (
        <div className={styles.addForm}>
          <div className={styles.formRow}>
            <label className={styles.label}>Muro A</label>
            <select
              className={styles.select}
              value={form.muro_a}
              onChange={(e) => setForm((f) => ({ ...f, muro_a: e.target.value }))}
            >
              {muros.map((_, idx) => (
                <option key={idx} value={`muro_${idx}`}>
                  {muroLabel(idx)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Muro B</label>
            <select
              className={styles.select}
              value={form.muro_b}
              onChange={(e) => setForm((f) => ({ ...f, muro_b: e.target.value }))}
            >
              {muros.map((_, idx) => (
                <option key={idx} value={`muro_${idx}`}>
                  {muroLabel(idx)}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Tipo de unión</label>
            <select
              className={styles.select}
              value={form.tipo_union}
              onChange={(e) => setForm((f) => ({ ...f, tipo_union: e.target.value }))}
            >
              {tipologias.map((t) => (
                <option key={t.codigo} value={t.codigo}>
                  {t.descripcion}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label}>Ángulo (°)</label>
            <input
              type="number"
              className={styles.input}
              value={form.angulo_grados}
              min={30}
              max={180}
              step={1}
              onChange={(e) => setForm((f) => ({ ...f, angulo_grados: Number(e.target.value) }))}
            />
          </div>

          {form.muro_a === form.muro_b && (
            <p className={styles.errorNote}>⚠ Debés seleccionar dos muros diferentes.</p>
          )}

          <div className={styles.formActions}>
            <button className={styles.cancelBtn} onClick={() => setAdding(false)}>
              Cancelar
            </button>
            <button
              className={styles.confirmBtn}
              onClick={handleAdd}
              disabled={form.muro_a === form.muro_b}
            >
              Confirmar unión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
