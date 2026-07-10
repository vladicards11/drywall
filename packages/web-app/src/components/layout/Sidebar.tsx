import React from 'react';
import styles from './Sidebar.module.css';
import { MuroForm } from '../form/MuroForm';
import { MurosList } from './MurosList';
import { UnionesPanel } from './UnionesPanel';
import { HistorialPanel } from './HistorialPanel';
import type { MuroFormData, FormErrors } from '../../hooks/useCalculadora';
import type { UnionFormData, ProyectoFormData, HistorialItem } from '../../hooks/useProyecto';
import type { Catalogo, Abertura } from '@drywall-calc/catalog-schemas';

interface SidebarProps {
  // Project management props
  proyecto: ProyectoFormData;
  historial: HistorialItem[];
  onUpdateNombre: (nombre: string) => void;
  onGuardarEnHistorial: () => void;
  onCargarDesdeHistorial: (id: string) => void;
  onEliminarDeHistorial: (id: string) => void;
  onImportarProyecto: (datos: ProyectoFormData) => void;

  // Multi-muro project props
  muros: MuroFormData[];
  selectedMuroIdx: number;
  uniones: UnionFormData[];
  onSelectMuro: (idx: number) => void;
  onAddMuro: () => void;
  onDuplicateMuro: (idx: number) => void;
  onRemoveMuro: (idx: number) => void;
  onAddUnion: (u: UnionFormData) => void;
  onRemoveUnion: (id: string) => void;

  // Current wall form
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
        {/* Gestión de Proyecto y backups */}
        <HistorialPanel
          proyecto={props.proyecto}
          historial={props.historial}
          onUpdateNombre={props.onUpdateNombre}
          onGuardarEnHistorial={props.onGuardarEnHistorial}
          onCargarDesdeHistorial={props.onCargarDesdeHistorial}
          onEliminarDeHistorial={props.onEliminarDeHistorial}
          onImportarProyecto={props.onImportarProyecto}
        />

        {/* Lista de muros */}
        <MurosList
          muros={props.muros}
          selected={props.selectedMuroIdx}
          onSelect={props.onSelectMuro}
          onAdd={props.onAddMuro}
          onDuplicate={props.onDuplicateMuro}
          onRemove={props.onRemoveMuro}
        />

        {/* Panel de uniones */}
        <UnionesPanel
          muros={props.muros}
          uniones={props.uniones}
          tipologias={props.catalogo.tipologias_union}
          onAdd={props.onAddUnion}
          onRemove={props.onRemoveUnion}
        />

        {/* Formulario del muro activo */}
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
