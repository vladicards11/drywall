import React from 'react';
import styles from './MurosList.module.css';

interface MurosListProps {
  muros: Array<{ largo_m: string; alto_m: string }>;
  selected: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  onDuplicate: (idx: number) => void;
  onRemove: (idx: number) => void;
}

export const MurosList: React.FC<MurosListProps> = ({
  muros,
  selected,
  onSelect,
  onAdd,
  onDuplicate,
  onRemove,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>🏗️ Muros del proyecto</span>
        <button
          id="btn-add-muro"
          className={styles.addBtn}
          onClick={onAdd}
          title="Agregar nuevo muro"
        >
          + Agregar muro
        </button>
      </div>

      <div className={styles.list}>
        {muros.map((m, idx) => (
          <div
            key={idx}
            className={`${styles.item} ${idx === selected ? styles.itemActive : ''}`}
            onClick={() => onSelect(idx)}
          >
            <div className={styles.itemInfo}>
              <span className={styles.itemNumber}>#{idx + 1}</span>
              <span className={styles.itemLabel}>
                {parseFloat(m.largo_m).toFixed(2)} × {parseFloat(m.alto_m).toFixed(2)} m
              </span>
            </div>
            <div className={styles.itemActions}>
              <button
                className={styles.iconBtn}
                onClick={(e) => { e.stopPropagation(); onDuplicate(idx); }}
                title="Duplicar muro"
              >
                ⧉
              </button>
              <button
                className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                disabled={muros.length <= 1}
                title="Eliminar muro"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
