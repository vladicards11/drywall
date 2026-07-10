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
  onUpdateCatalogoSistema: (sistema: string) => void;
  onGuardarEnHistorial: () => void;
  onCargarDesdeHistorial: (id: string) => void;
  onEliminarDeHistorial: (id: string) => void;
  onImportarProyecto: (datos: ProyectoFormData) => void;
  onAbrirIfcImporter: () => void;

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

      {/* BIM / IFC import shortcut */}
      <button
        id="btn-ifc-importer"
        onClick={props.onAbrirIfcImporter}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          width: 'calc(100% - 2rem)',
          margin: '0.5rem 1rem 0',
          padding: '0.55rem 0.9rem',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))',
          border: '1px solid rgba(99,102,241,0.35)',
          borderRadius: '10px',
          color: '#818cf8',
          fontSize: '0.83rem',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.10))')}
      >
        <span>🏗️</span>
        <span>Importar desde IFC / BIM</span>
      </button>

      <div className={styles.scrollArea}>
        {/* Gestión de Proyecto y backups */}
        <HistorialPanel
          proyecto={props.proyecto}
          historial={props.historial}
          onUpdateNombre={props.onUpdateNombre}
          onUpdateCatalogoSistema={props.onUpdateCatalogoSistema}
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
