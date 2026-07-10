import React from 'react';
import styles from './Sidebar.module.css';
import { MuroForm } from '../form/MuroForm';
import type { MuroFormData, FormErrors } from '../../hooks/useCalculadora';
import type { Catalogo, Abertura } from '@drywall-calc/catalog-schemas';

interface SidebarProps {
  form: MuroFormData;
  errors: FormErrors;
  catalogo: Catalogo;
  isCalculating: boolean;
  onFieldChange: <K extends keyof MuroFormData>(key: K, value: MuroFormData[K]) => void;
  onAddAbertura: (ab: Abertura) => void;
  onRemoveAbertura: (idx: number) => void;
  onCalcular: () => void;
  onReset: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoBadge}>DW</div>
          <div>
            <h1 className={styles.logoTitle}>Drywall Calc</h1>
            <p className={styles.logoSubtitle}>Motor de cómputo métrico</p>
          </div>
        </div>
      </div>

      <div className={styles.scrollArea}>
        <MuroForm
          form={props.form}
          errors={props.errors}
          catalogo={props.catalogo}
          onFieldChange={props.onFieldChange}
          onAddAbertura={props.onAddAbertura}
          onRemoveAbertura={props.onRemoveAbertura}
          onCalcular={props.onCalcular}
          onReset={props.onReset}
          isCalculating={props.isCalculating}
        />
      </div>
    </aside>
  );
};
